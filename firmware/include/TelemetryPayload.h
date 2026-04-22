#pragma once

struct TelemetryPayload {
  float heartRate = 0.0f;
  float spo2 = 0.0f;
  float temperature = NAN;
  float stress = 0.0f;
  float hydration = 0.0f;
  float perfusionIndex = 0.0f;
  float respiratoryRate = 0.0f;
  float movement = 0.0f;
  float shockIndex = 0.0f;
  float fallRisk = 0.0f;
  float signalQuality = 0.0f;
  uint32_t deviceUptime = 0;
};
