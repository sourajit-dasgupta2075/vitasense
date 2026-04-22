#include "VitalAlgorithms.h"

float VitalAlgorithms::clamp(float value, float low, float high) {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}

float VitalAlgorithms::estimateStress(float heartRate, float movement) {
  float stress = (heartRate - 55.0f) * 1.15f + movement * 20.0f;
  return clamp(stress, 0.0f, 100.0f);
}

float VitalAlgorithms::estimateHydration(float temperature, float motionEnergy) {
  float hydration = 100.0f - ((temperature - 36.5f) * 18.0f) - (motionEnergy * 4.0f);
  return clamp(hydration, 35.0f, 100.0f);
}

float VitalAlgorithms::estimatePerfusionIndex(uint32_t irValue) {
  float normalized = irValue / 90000.0f;
  return clamp(normalized * 4.5f, 0.2f, 20.0f);
}

float VitalAlgorithms::estimateRespiratoryRate(float heartRate, float motionEnergy) {
  float rate = 12.0f + ((heartRate - 70.0f) / 15.0f) - (motionEnergy * 0.4f);
  return clamp(rate, 8.0f, 30.0f);
}

float VitalAlgorithms::estimateMovement(float ax, float ay, float az, float gx, float gy, float gz) {
  float accelMagnitude = sqrtf((ax * ax) + (ay * ay) + (az * az));
  float gyroMagnitude = sqrtf((gx * gx) + (gy * gy) + (gz * gz));
  return clamp((fabsf(accelMagnitude - 9.81f) * 0.15f) + (gyroMagnitude * 0.01f), 0.0f, 10.0f);
}

float VitalAlgorithms::estimateShockIndex(float heartRate, float systolicProxy) {
  if (systolicProxy <= 1.0f) return 0.0f;
  return clamp(heartRate / systolicProxy, 0.2f, 2.0f);
}

float VitalAlgorithms::estimateFallRisk(float movement, float gy, float gz) {
  float rotationalChange = fabsf(gy) + fabsf(gz);
  float score = (movement * 0.9f) + (rotationalChange * 0.02f);
  return clamp(score, 0.0f, 10.0f);
}

float VitalAlgorithms::estimateSignalQuality(uint32_t irValue, uint32_t redValue) {
  float ratio = (redValue > 0) ? ((float)irValue / (float)redValue) : 0.0f;
  float confidence = 100.0f - (fabsf(1.0f - ratio) * 35.0f);
  return clamp(confidence, 40.0f, 100.0f);
}

// Adaptive Fusion Methods

float VitalAlgorithms::calculateSignalReliability(uint32_t irValue, uint32_t redValue, float motion) {
  // Assess signal quality based on:
  // 1. IR/Red ratio stability (PPG signal quality indicator)
  // 2. Signal levels in valid range
  // 3. Motion corruption factor
  
  // Base quality from PPG signal
  float ratio = (redValue > 0) ? ((float)irValue / (float)redValue) : 0.0f;
  float ratioQuality = 1.0f - clamp(fabsf(1.0f - ratio) / 2.0f, 0.0f, 1.0f);
  
  // Signal level validity (should be in reasonable range)
  float irValid = (irValue > 50000 && irValue < 100000) ? 1.0f : 0.6f;
  float redValid = (redValue > 30000 && redValue < 90000) ? 1.0f : 0.6f;
  float signalLevelQuality = (irValid + redValid) / 2.0f;
  
  // Motion corruption: high motion reduces reliability
  float motionPenalty = 1.0f - clamp(motion / 10.0f, 0.0f, 1.0f);
  
  // Combined reliability (0.0 to 1.0)
  float reliability = (ratioQuality * 0.4f + signalLevelQuality * 0.4f + motionPenalty * 0.2f);
  return clamp(reliability, 0.0f, 1.0f);
}

float VitalAlgorithms::getAdaptiveHeartRateWeight(float signalReliability, float motion) {
  // Adaptive weight for current reading in exponential smoothing:
  // y_new = weight * current + (1 - weight) * previous
  
  // Motion factor: reduce weight when moving
  float motionFactor = 1.0f - clamp(motion / 8.0f, 0.0f, 0.6f);
  
  // Reliability factor: increase weight when signal is good
  float reliabilityFactor = clamp(signalReliability, 0.3f, 0.9f);
  
  // Base weight modified by reliability and motion
  float baseWeight = 0.4f;  // Default: 40% new, 60% smoothed
  float adaptiveWeight = baseWeight * reliabilityFactor * motionFactor;
  
  return clamp(adaptiveWeight, 0.15f, 0.7f);
}

float VitalAlgorithms::getAdaptiveSpo2Weight(float signalReliability, float motion) {
  // SpO2 typically needs more smoothing than HR, so weight is slightly lower
  
  float motionFactor = 1.0f - clamp(motion / 8.0f, 0.0f, 0.6f);
  float reliabilityFactor = clamp(signalReliability, 0.25f, 0.85f);
  
  float baseWeight = 0.3f;  // Default: 30% new, 70% smoothed (more conservative)
  float adaptiveWeight = baseWeight * reliabilityFactor * motionFactor;
  
  return clamp(adaptiveWeight, 0.1f, 0.6f);
}

float VitalAlgorithms::estimateHeartRateAdaptive(uint32_t irValue, float lastHeartRate, float motion, uint32_t redValue) {
  // Estimate from current IR value
  float estimate = 72.0f + ((irValue % 15000) / 15000.0f) * 28.0f;
  
  // Calculate signal reliability
  float reliability = calculateSignalReliability(irValue, redValue, motion);
  
  // Get adaptive weight
  float weight = getAdaptiveHeartRateWeight(reliability, motion);
  
  // Apply adaptive smoothing
  float filtered = (weight * estimate) + ((1.0f - weight) * lastHeartRate);
  
  return clamp(filtered, 50.0f, 135.0f);
}

float VitalAlgorithms::estimateSpo2Adaptive(uint32_t irValue, uint32_t redValue, float lastSpo2, float motion) {
  // Estimate from IR/Red ratio
  float ratio = redValue > 0 ? (float)irValue / (float)redValue : 1.0f;
  float estimate = 99.0f - fabsf(1.0f - ratio) * 12.0f;
  
  // Calculate signal reliability
  float reliability = calculateSignalReliability(irValue, redValue, motion);
  
  // Get adaptive weight
  float weight = getAdaptiveSpo2Weight(reliability, motion);
  
  // Apply adaptive smoothing
  float filtered = (weight * estimate) + ((1.0f - weight) * lastSpo2);
  
  return clamp(filtered, 88.0f, 100.0f);
}
