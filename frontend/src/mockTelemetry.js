export function buildDemoTelemetry(connected = true) {
  const movement = Number((Math.random() * 0.14).toFixed(2));
  const heartRate = 88 + Math.round(Math.random() * 6);
  const spo2 = 96 + Math.round(Math.random() * 2);
  const temperatureDetected = Math.random() > 0.45;
  const temperature = temperatureDetected ? Number((36.5 + Math.random() * 0.4).toFixed(1)) : null;
  const hydration = 92 + Math.round(Math.random() * 8);
  const stress = 42 + Math.round(Math.random() * 10);
  const perfusion = Number((2.6 + Math.random() * 4.8).toFixed(2));
  const respiratoryRate = 12 + Math.round(Math.random() * 3);
  const shock = Number((0.55 + Math.random() * 0.35).toFixed(2));
  const signalQuality = 84 + Math.round(Math.random() * 13);

  return {
    device: {
      connected,
      board: "ESP32 Dev Module",
      sensors: ["MAX30102", "DS18B20", "MPU6050"]
    },
    metrics: {
      heartRate: { value: heartRate, status: "Tracked", state: "normal" },
      spo2: { value: spo2, status: "Normal", state: "normal" },
      temperature: { value: temperature ?? "--", status: temperatureDetected ? "Tracked" : "No Data", state: temperatureDetected ? "normal" : "warning" },
      stress: { value: stress, status: stress > 65 ? "High" : "Moderate", state: "normal" },
      hydration: { value: hydration, status: hydration > 80 ? "Adequate" : "Low", state: "normal" },
      perfusionIndex: { value: perfusion, status: "Tracked", state: perfusion > 5 ? "warning" : "normal" },
      respiratoryRate: { value: respiratoryRate, status: "Tracked", state: "normal" },
      movement: { value: movement.toFixed(2), status: movement < 0.15 ? "Minimal" : "Active", state: "normal" },
      shockIndex: { value: shock, status: shock > 0.9 ? "Elevated" : "Stable", state: shock > 0.9 ? "warning" : "normal" },
      fallRisk: { value: movement > 1.2 ? 7 : 2, status: movement > 1.2 ? "Elevated" : "Low", state: movement > 1.2 ? "warning" : "normal" },
      signalQuality: { value: signalQuality, status: signalQuality > 80 ? "Strong" : "Weak", state: signalQuality > 80 ? "normal" : "warning" },
      deviceUptime: { value: 37, status: "Streaming", state: "normal" }
    }
  };
}
