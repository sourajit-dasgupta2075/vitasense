/**
 * Adaptive Sensor Fusion Service
 * 
 * Implements real-time adaptive weighting for combining multiple sensor streams
 * based on signal reliability and motion levels. This improves accuracy during
 * high-motion scenarios and stabilizes measurements during low signal quality.
 */

/**
 * Calculate signal reliability score (0 to 1)
 * Based on: signal quality, sensor consistency, and motion artifacts
 * 
 * @param {number} signalQuality - Signal quality percentage (0-100)
 * @param {number} motion - Current motion level (0-10)
 * @param {number} anomaly - Whether reading is detected as anomaly (0 or 1)
 * @returns {number} Reliability score 0-1
 */
export function calculateSignalReliability(signalQuality, motion, anomaly = 0) {
  // Normalize signal quality (0-100 to 0-1)
  const qualityFactor = Math.max(0.3, Math.min(1.0, signalQuality / 100));
  
  // Motion penalty: high motion reduces reliability
  const motionPenalty = 1.0 - Math.min(1.0, motion / 8.0);
  
  // Anomaly penalty: detected anomalies reduce reliability
  const anomalyPenalty = anomaly ? 0.7 : 1.0;
  
  // Combined reliability
  const reliability = qualityFactor * 0.5 + motionPenalty * 0.3 + anomalyPenalty * 0.2;
  
  return Math.max(0.0, Math.min(1.0, reliability));
}

/**
 * Calculate adaptive weight for heart rate measurements
 * Higher weight = more trust in current reading
 * Lower weight = more reliance on historical smoothing
 * 
 * @param {number} reliability - Signal reliability (0-1)
 * @param {number} motion - Motion level (0-10)
 * @returns {number} Adaptive weight for exponential smoothing
 */
export function getAdaptiveHeartRateWeight(reliability, motion) {
  // Motion factor: reduce weight when moving significantly
  const motionFactor = 1.0 - Math.min(0.6, motion / 8.0);
  
  // Reliability factor: increase weight when signal is good
  const reliabilityFactor = Math.max(0.3, Math.min(0.9, reliability));
  
  // Base weight: 35% new reading by default
  const baseWeight = 0.35;
  const adaptiveWeight = baseWeight * reliabilityFactor * motionFactor;
  
  return Math.max(0.15, Math.min(0.7, adaptiveWeight));
}

/**
 * Calculate adaptive weight for SpO2 measurements
 * SpO2 is more sensitive to motion, so uses more conservative weighting
 * 
 * @param {number} reliability - Signal reliability (0-1)
 * @param {number} motion - Motion level (0-10)
 * @returns {number} Adaptive weight for exponential smoothing
 */
export function getAdaptiveSpo2Weight(reliability, motion) {
  // SpO2 needs more smoothing, so base weight is lower
  const motionFactor = 1.0 - Math.min(0.6, motion / 8.0);
  const reliabilityFactor = Math.max(0.25, Math.min(0.85, reliability));
  
  // Base weight: 25% new reading (more smoothing than HR)
  const baseWeight = 0.25;
  const adaptiveWeight = baseWeight * reliabilityFactor * motionFactor;
  
  return Math.max(0.1, Math.min(0.6, adaptiveWeight));
}

/**
 * Apply adaptive smoothing using exponential moving average
 * with dynamic weights based on signal conditions
 * 
 * @param {number} currentReading - Current sensor reading
 * @param {number} previousSmoothed - Previously smoothed value
 * @param {number} reliability - Signal reliability (0-1)
 * @param {number} motion - Motion level (0-10)
 * @param {string} measurementType - 'heartRate' or 'spo2'
 * @returns {number} Adaptively smoothed reading
 */
export function adaptiveSmoothReading(currentReading, previousSmoothed, reliability, motion, measurementType = 'heartRate') {
  // Select appropriate weight function
  const getWeight = measurementType === 'spo2' ? getAdaptiveSpo2Weight : getAdaptiveHeartRateWeight;
  const weight = getWeight(reliability, motion);
  
  // Apply exponential smoothing with adaptive weight
  return weight * currentReading + (1 - weight) * previousSmoothed;
}

/**
 * Calculate adaptive health score penalties based on signal context
 * Adjusts severity of reading deviations based on measurement reliability
 * 
 * @param {Object} reading - Health reading object
 * @param {Object} options - Calculation options
 * @returns {Object} Adaptive penalties object
 */
export function calculateAdaptivePenalties(reading, options = {}) {
  const {
    motionThreshold = 2.5,
    qualityThreshold = 70
  } = options;
  
  // Calculate signal reliability
  const reliability = calculateSignalReliability(
    reading.signalQuality || 85,
    reading.motion || 0,
    reading.anomaly ? 1 : 0
  );
  
  // Base penalty calculation (standard deviations from healthy range)
  const heartRatePenaltyRaw = Math.min(30, Math.abs(reading.heartRate - 78) * 0.7);
  const spo2PenaltyRaw = Math.min(40, Math.max(0, 97 - reading.spo2) * 6);
  const tempPenaltyRaw = Math.min(20, Math.abs(reading.temperature - 36.8) * 10);
  const motionPenaltyRaw = Math.min(15, Math.max(0, reading.motion - motionThreshold) * 3.5);
  
  // Adjust penalties based on reliability
  // Low reliability: increase penalty confidence (reading may be inaccurate)
  // High reliability: use penalties as-is
  const reliabilityMultiplier = 0.6 + (reliability * 0.4); // Range: 0.6 - 1.0
  
  // Apply motion context to HR and SpO2 penalties
  // If motion is high, be more lenient with HR changes (less penalty)
  const motionContext = reading.motion > 3 ? 0.75 : 1.0;
  
  return {
    heartRate: heartRatePenaltyRaw * reliabilityMultiplier * motionContext,
    spo2: spo2PenaltyRaw * reliabilityMultiplier,
    temperature: tempPenaltyRaw * reliabilityMultiplier,
    motion: motionPenaltyRaw,
    reliability,
    totalPenalty: (
      heartRatePenaltyRaw * reliabilityMultiplier * motionContext +
      spo2PenaltyRaw * reliabilityMultiplier +
      tempPenaltyRaw * reliabilityMultiplier +
      motionPenaltyRaw
    )
  };
}

/**
 * Calculate adaptive health score using fusion of multiple measurements
 * Accounts for signal quality and motion during evaluation
 * 
 * @param {Object} reading - Health reading object
 * @returns {number} Adaptive health score (0-100)
 */
export function calculateAdaptiveHealthScore(reading) {
  const penalties = calculateAdaptivePenalties(reading);
  
  // Calculate base score
  const baseScore = Math.max(0, Math.min(100, Math.round(100 - penalties.totalPenalty)));
  
  // Apply confidence adjustment based on signal reliability
  // High reliability: score is more trustworthy
  // Low reliability: slightly dampen the score (more conservative)
  if (penalties.reliability < 0.5) {
    // Low reliability: conservative scoring
    const avgRecentScore = (baseScore + 75) / 2; // Shift towards middle
    return Math.round(avgRecentScore);
  }
  
  return baseScore;
}

/**
 * Determine measurement confidence level based on signal state
 * Used for UI/alerting decisions
 * 
 * @param {Object} reading - Health reading object
 * @returns {string} Confidence level: 'high', 'medium', 'low'
 */
export function getMeasurementConfidence(reading) {
  const reliability = calculateSignalReliability(
    reading.signalQuality || 85,
    reading.motion || 0,
    reading.anomaly ? 1 : 0
  );
  
  if (reliability > 0.75) {
    return 'high';
  } else if (reliability > 0.5) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Generate fusion metadata for diagnostics
 * 
 * @param {Object} reading - Health reading object
 * @returns {Object} Fusion diagnostics
 */
export function getFusionMetadata(reading) {
  const reliability = calculateSignalReliability(
    reading.signalQuality || 85,
    reading.motion || 0,
    reading.anomaly ? 1 : 0
  );
  
  const hrWeight = getAdaptiveHeartRateWeight(reliability, reading.motion || 0);
  const spo2Weight = getAdaptiveSpo2Weight(reliability, reading.motion || 0);
  
  return {
    signalReliability: Math.round(reliability * 100),
    adaptiveHeartRateWeight: Math.round(hrWeight * 100),
    adaptiveSpo2Weight: Math.round(spo2Weight * 100),
    confidence: getMeasurementConfidence(reading),
    motionCorrected: reading.motion > 3,
    signalQualityEffective: Math.round(reading.signalQuality * reliability)
  };
}
