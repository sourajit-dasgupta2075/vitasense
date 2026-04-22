# Adaptive Sensor Fusion Implementation

## Overview
Implemented real-time adaptive weighting for the VitaSense sensor fusion model. The system now dynamically adjusts sensor data combination weights based on **signal reliability** and **motion levels**, replacing fixed weighting with context-aware intelligent fusion.

## Key Improvements

### 1. **Signal Reliability Assessment**
The system now calculates signal reliability (0-1 scale) considering:
- **PPG Signal Quality**: IR/Red ratio stability (photoplethysmography quality indicator)
- **Signal Levels**: Whether sensor readings are in valid operational ranges
- **Motion Artifacts**: High motion reduces reliability; low motion increases confidence

```
Reliability = (ratioQuality × 0.4) + (signalLevelQuality × 0.4) + (motionPenalty × 0.2)
```

### 2. **Adaptive Weight Calculation**

#### Heart Rate Adaptive Weight
- **Base weight**: 35% new reading (65% historical smoothing)
- **Adjusted by**: Signal reliability × Motion factor
- **Range**: 15-70%
- **Effect**: Quickly responds to reliable, low-motion readings; resists change during high motion

#### SpO₂ Adaptive Weight  
- **Base weight**: 25% new reading (75% historical smoothing - more conservative)
- **Adjusted by**: Signal reliability × Motion factor
- **Range**: 10-60%
- **Effect**: SpO₂ is motion-sensitive, so more smoothing applied

### 3. **Dynamic Health Score Calculation**
The health score now accounts for:
- **Measurement confidence**: Penalties adjusted based on reliability
- **Motion context**: Less strict HR deviation penalties during movement
- **Signal quality impact**: Conservative scoring during poor signal conditions

```
Effective Penalty = Raw Penalty × Reliability Multiplier × Motion Context
```

## Implementation Details

### Firmware Changes (VitalAlgorithms.cpp)
New methods added:
- `calculateSignalReliability()` - Assesses current signal quality
- `getAdaptiveHeartRateWeight()` - Calculates HR-specific adaptive weight
- `getAdaptiveSpo2Weight()` - Calculates SpO₂-specific adaptive weight
- `estimateHeartRateAdaptive()` - HR estimation with adaptive smoothing
- `estimateSpo2Adaptive()` - SpO₂ estimation with adaptive smoothing

### Backend Services (Node.js)

#### New: fusionService.js
Comprehensive fusion utilities:
- `calculateSignalReliability()` - Multi-factor reliability assessment
- `getAdaptiveHeartRateWeight()` / `getAdaptiveSpo2Weight()` - Weight calculation
- `adaptiveSmoothReading()` - Apply adaptive exponential moving average
- `calculateAdaptivePenalties()` - Context-aware penalty calculation
- `calculateAdaptiveHealthScore()` - Improved health scoring
- `getMeasurementConfidence()` - Confidence level ('high'/'medium'/'low')
- `getFusionMetadata()` - Diagnostics and weight transparency

#### Updated: scoreService.js
- Now uses `calculateAdaptiveHealthScore()` instead of fixed penalty calculation
- Maintains backward compatibility with `deriveStatus()`

## Behavior Changes

### Before (Fixed Weights)
```
HR: 40% new, 60% smoothed (always)
SpO₂: 25% new, 75% smoothed (always)
Penalties: Fixed multipliers regardless of signal quality
```

### After (Adaptive Weights)
```
HR during low-motion, high-signal: 60-70% new, 30-40% smoothed → Quick response
HR during high-motion: 15-25% new, 75-85% smoothed → Resists noise
SpO₂ during high-reliability: 45-60% new, 40-55% smoothed
SpO₂ during low-reliability: 10-15% new, 85-90% smoothed → Maximum filtering

Health Score: Adjusted based on signal reliability and motion context
```

## Performance Benefits

1. **Noise Rejection**: High motion automatically triggers stronger smoothing
2. **Responsiveness**: Good signal conditions allow quick measurement updates
3. **Robustness**: Graceful degradation when signal quality drops
4. **Accuracy**: Context-aware scoring reduces false alerts during movement
5. **Transparency**: Fusion metadata available for diagnostics

## Example Scenarios

### Scenario 1: Resting Patient (Low Motion, High Signal Quality)
- Reliability: 0.85
- HR Weight: 55% new → Responsive to real changes
- SpO₂ Weight: 40% new → Quick SpO₂ trends visible
- Health Score: Full penalties applied (high confidence)

### Scenario 2: Walking Patient (High Motion)
- Reliability: 0.45  
- HR Weight: 20% new → HR fluctuations heavily filtered
- SpO₂ Weight: 15% new → SpO₂ changes extremely smoothed
- Health Score: Penalties reduced (low confidence measurement)

### Scenario 3: Poor Signal (Low IR/Red Levels)
- Reliability: 0.35
- HR Weight: 15% new (minimum) → Maximum smoothing
- SpO₂ Weight: 10% new (minimum) → Maximum smoothing
- Health Score: Conservative (shifted toward 75)

## Integration Points

### Firmware
- `main.cpp`: Line ~100 - Uses `estimateHeartRateAdaptive()` and `estimateSpo2Adaptive()`

### Backend API
- POST `/api/data` - Creates readings using adaptive health score
- GET `/api/dashboard` - Returns readings with adaptive scoring
- Can query fusion diagnostics via `getFusionMetadata()`

## Testing Recommendations

1. **Stationary test**: Verify quick response to HR/SpO₂ changes
2. **Motion test**: Verify noise rejection during arm movement
3. **Poor signal test**: Simulate sensor dust/displacement - verify graceful degradation
4. **Stress test**: Rapid HR changes at different motion levels

## Future Enhancements

- Multi-sensor fusion (combine MAX30102 + camera-based measurements)
- Machine learning-based reliability prediction
- Seasonal/daily adaptation (learn user-specific baselines)
- Anomaly detection using historical fusion patterns
- Real-time weight visualization in dashboard
