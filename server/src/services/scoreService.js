import { calculateAdaptiveHealthScore } from "./fusionService.js";

export function deriveStatus(reading) {
  if (reading.heartRate > 125 || reading.heartRate < 45 || reading.spo2 < 92) return "critical";
  if (reading.heartRate > 105 || reading.heartRate < 55 || reading.spo2 < 95 || reading.temperature > 37.8) return "warning";
  return "normal";
}

export function calculateHealthScore(reading) {
  // Use adaptive health score calculation that accounts for signal reliability and motion
  return calculateAdaptiveHealthScore(reading);
}
