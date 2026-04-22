#pragma once

#include <Arduino.h>
#include "TelemetryPayload.h"

class VitalAlgorithms {
 public:
  static float clamp(float value, float low, float high);
  static float estimateStress(float heartRate, float movement);
  static float estimateHydration(float temperature, float motionEnergy);
  static float estimatePerfusionIndex(uint32_t irValue);
  static float estimateRespiratoryRate(float heartRate, float motionEnergy);
  static float estimateMovement(float ax, float ay, float az, float gx, float gy, float gz);
  static float estimateShockIndex(float heartRate, float systolicProxy);
  static float estimateFallRisk(float movement, float gy, float gz);
  static float estimateSignalQuality(uint32_t irValue, uint32_t redValue);
  
  // Adaptive fusion methods
  static float calculateSignalReliability(uint32_t irValue, uint32_t redValue, float motion);
  static float getAdaptiveHeartRateWeight(float signalReliability, float motion);
  static float getAdaptiveSpo2Weight(float signalReliability, float motion);
  static float estimateHeartRateAdaptive(uint32_t irValue, float lastHeartRate, float motion, uint32_t redValue);
  static float estimateSpo2Adaptive(uint32_t irValue, uint32_t redValue, float lastSpo2, float motion);
};
