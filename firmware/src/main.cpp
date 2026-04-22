#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include "MAX30105.h"
#include "VitalAlgorithms.h"

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "http://192.168.0.10:4000/api/data";

constexpr uint8_t ONE_WIRE_BUS = 4;
constexpr uint8_t I2C_SDA = 21;
constexpr uint8_t I2C_SCL = 22;
constexpr uint32_t POST_INTERVAL_MS = 5000;

MAX30105 max30102;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);
Adafruit_MPU6050 mpu;

uint32_t lastPost = 0;
float lastHeartRate = 88.0f;
float lastSpo2 = 97.0f;

float clampValue(float value, float low, float high) {
  return value < low ? low : value > high ? high : value;
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
}

void setupSensors() {
  Wire.begin(I2C_SDA, I2C_SCL);
  ds18b20.begin();

  if (!max30102.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found");
  } else {
    max30102.setup();
    max30102.setPulseAmplitudeRed(0x0A);
    max30102.setPulseAmplitudeGreen(0);
  }

  if (!mpu.begin()) {
    Serial.println("MPU6050 not found");
  }
}

float estimateHeartRate(uint32_t irValue) {
  // DEPRECATED: Use adaptive version below
  float estimate = 72.0f + ((irValue % 15000) / 15000.0f) * 28.0f;
  lastHeartRate = (lastHeartRate * 0.7f) + (estimate * 0.3f);
  return clampValue(lastHeartRate, 50.0f, 135.0f);
}

float estimateSpo2(uint32_t irValue, uint32_t redValue) {
  // DEPRECATED: Use adaptive version below
  float ratio = redValue > 0 ? (float)irValue / (float)redValue : 1.0f;
  float estimate = 99.0f - fabsf(1.0f - ratio) * 12.0f;
  lastSpo2 = (lastSpo2 * 0.75f) + (estimate * 0.25f);
  return clampValue(lastSpo2, 88.0f, 100.0f);
}

float estimateHeartRateAdaptive(uint32_t irValue, uint32_t redValue, float motion) {
  lastHeartRate = VitalAlgorithms::estimateHeartRateAdaptive(irValue, lastHeartRate, motion, redValue);
  return lastHeartRate;
}

float estimateSpo2Adaptive(uint32_t irValue, uint32_t redValue, float motion) {
  lastSpo2 = VitalAlgorithms::estimateSpo2Adaptive(irValue, redValue, lastSpo2, motion);
  return lastSpo2;
}

float estimateMotion() {
  sensors_event_t accel;
  sensors_event_t gyro;
  sensors_event_t temp;
  mpu.getEvent(&accel, &gyro, &temp);

  float accelMag = sqrtf(
    accel.acceleration.x * accel.acceleration.x +
    accel.acceleration.y * accel.acceleration.y +
    accel.acceleration.z * accel.acceleration.z
  );

  float gyroMag = sqrtf(
    gyro.gyro.x * gyro.gyro.x +
    gyro.gyro.y * gyro.gyro.y +
    gyro.gyro.z * gyro.gyro.z
  );

  return clampValue((fabsf(accelMag - 9.81f) * 0.14f) + (gyroMag * 0.02f), 0.0f, 10.0f);
}

void postTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  uint32_t irValue = max30102.getIR();
  uint32_t redValue = max30102.getRed();

  ds18b20.requestTemperatures();
  float temperature = ds18b20.getTempCByIndex(0);
  if (temperature < -40 || temperature > 125) {
    temperature = 36.6f;
  }

  // Estimate motion first (needed for adaptive fusion)
  float motion = estimateMotion();
  
  // Use adaptive fusion for heart rate and SpO2 based on signal reliability and motion
  float heartRate = estimateHeartRateAdaptive(irValue, redValue, motion);
  float spo2 = estimateSpo2Adaptive(irValue, redValue, motion);

  StaticJsonDocument<256> payload;
  payload["heartRate"] = roundf(heartRate);
  payload["spo2"] = roundf(spo2);
  payload["temperature"] = roundf(temperature * 10.0f) / 10.0f;
  payload["motion"] = roundf(motion * 100.0f) / 100.0f;
  payload["deviceId"] = "esp32-vitasense";

  String body;
  serializeJson(payload, body);

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  int responseCode = http.POST(body);

  Serial.println(body);
  Serial.printf("POST status: %d\n", responseCode);
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(400);
  setupSensors();
  connectWifi();
}

void loop() {
  if (millis() - lastPost >= POST_INTERVAL_MS) {
    lastPost = millis();
    postTelemetry();
  }
  delay(50);
}
