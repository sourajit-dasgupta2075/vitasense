const MIN_BPM = 45;
const MAX_BPM = 180;
const MIN_HZ = MIN_BPM / 60;
const MAX_HZ = MAX_BPM / 60;

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values, average = mean(values)) {
  if (values.length < 2) return 0;
  const variance = values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function linearDetrend(samples) {
  if (samples.length < 3) return samples.map((sample) => ({ ...sample, value: sample.value }));

  const times = samples.map((sample) => sample.time);
  const values = samples.map((sample) => sample.value);
  const avgX = mean(times);
  const avgY = mean(values);
  const numerator = times.reduce((total, x, index) => total + (x - avgX) * (values[index] - avgY), 0);
  const denominator = times.reduce((total, x) => total + (x - avgX) ** 2, 0) || 1;
  const slope = numerator / denominator;
  const intercept = avgY - slope * avgX;

  return samples.map((sample) => ({
    ...sample,
    value: sample.value - (slope * sample.time + intercept)
  }));
}

function highPassFilter(values, sampleRate, cutoff = 0.7) {
  if (!values.length) return [];
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = rc / (rc + dt);
  const output = [values[0]];

  for (let index = 1; index < values.length; index += 1) {
    output[index] = alpha * (output[index - 1] + values[index] - values[index - 1]);
  }

  return output;
}

function lowPassFilter(values, sampleRate, cutoff = 3.2) {
  if (!values.length) return [];
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = dt / (rc + dt);
  const output = [values[0]];

  for (let index = 1; index < values.length; index += 1) {
    output[index] = output[index - 1] + alpha * (values[index] - output[index - 1]);
  }

  return output;
}

function bandpassFilter(values, sampleRate) {
  return lowPassFilter(highPassFilter(values, sampleRate), sampleRate);
}

function discreteFft(values, sampleRate) {
  const amplitudes = [];
  const resolution = 0.02;

  for (let frequency = MIN_HZ; frequency <= MAX_HZ; frequency += resolution) {
    let real = 0;
    let imaginary = 0;
    const angularFrequency = -2 * Math.PI * frequency / sampleRate;

    for (let index = 0; index < values.length; index += 1) {
      const angle = angularFrequency * index;
      real += values[index] * Math.cos(angle);
      imaginary += values[index] * Math.sin(angle);
    }

    const amplitude = Math.sqrt(real ** 2 + imaginary ** 2);
    amplitudes.push({ frequency, amplitude });
  }

  return amplitudes;
}

function detectPeaks(values, sampleRate) {
  const peaks = [];
  const refractorySamples = Math.max(4, Math.round(sampleRate * 0.35));
  const baseline = mean(values);
  const deviation = standardDeviation(values, baseline);
  const threshold = baseline + deviation * 0.35;

  for (let index = 1; index < values.length - 1; index += 1) {
    const isPeak = values[index] > threshold && values[index] > values[index - 1] && values[index] >= values[index + 1];
    const farEnough = !peaks.length || index - peaks[peaks.length - 1] > refractorySamples;
    if (isPeak && farEnough) {
      peaks.push(index);
    }
  }

  return peaks;
}

function calculateStress(peaks, sampleRate) {
  if (peaks.length < 3) {
    return { label: "Calibrating", index: 0 };
  }

  const rrIntervals = [];
  for (let index = 1; index < peaks.length; index += 1) {
    rrIntervals.push(((peaks[index] - peaks[index - 1]) / sampleRate) * 1000);
  }

  const sdnn = standardDeviation(rrIntervals);
  const normalized = Math.max(0, Math.min(100, Math.round(100 - sdnn / 2)));

  if (normalized >= 70) return { label: "Elevated", index: normalized };
  if (normalized >= 40) return { label: "Moderate", index: normalized };
  return { label: "Balanced", index: normalized };
}

export function analyzeSignal(samples, faceAreaRatio = 0) {
  if (samples.length < 48) {
    return {
      bpm: null,
      sampleRate: 0,
      filteredSignal: [],
      quality: { label: "Low", score: 0.18 },
      status: "Detecting face",
      stress: { label: "Calibrating", index: 0 }
    };
  }

  const firstTime = samples[0].time;
  const normalizedSamples = samples.map((sample) => ({
    time: (sample.time - firstTime) / 1000,
    value: sample.value
  }));
  const duration = normalizedSamples[normalizedSamples.length - 1].time - normalizedSamples[0].time;
  const sampleRate = duration > 0 ? normalizedSamples.length / duration : 0;

  if (sampleRate < 6) {
    return {
      bpm: null,
      sampleRate,
      filteredSignal: [],
      quality: { label: "Low", score: 0.2 },
      status: "Increasing signal",
      stress: { label: "Calibrating", index: 0 }
    };
  }

  const detrended = linearDetrend(normalizedSamples);
  const filteredValues = bandpassFilter(detrended.map((sample) => sample.value), sampleRate);
  const spectrum = discreteFft(filteredValues, sampleRate);
  const strongest = spectrum.reduce((best, current) => (current.amplitude > best.amplitude ? current : best), { frequency: 0, amplitude: 0 });
  const totalAmplitude = spectrum.reduce((total, item) => total + item.amplitude, 0) || 1;
  const qualityScore = Math.max(0, Math.min(1, strongest.amplitude / totalAmplitude * 9 + Math.min(faceAreaRatio * 5, 0.35)));
  const bpm = strongest.frequency ? Math.round(strongest.frequency * 60) : null;
  const peaks = detectPeaks(filteredValues, sampleRate);
  const stress = calculateStress(peaks, sampleRate);
  const normalizedWave = filteredValues.map((value, index) => ({
    time: normalizedSamples[index]?.time ?? index / sampleRate,
    value: Number(value.toFixed(4))
  }));

  let qualityLabel = "Low";
  if (qualityScore > 0.62) qualityLabel = "High";
  else if (qualityScore > 0.36) qualityLabel = "Medium";

  const status = !bpm ? "Calculating" : qualityScore > 0.62 ? "Stable reading" : "Calculating";

  return {
    bpm,
    sampleRate,
    filteredSignal: normalizedWave,
    quality: {
      label: qualityLabel,
      score: Number(qualityScore.toFixed(2))
    },
    status,
    stress
  };
}

export function trimSignalWindow(samples, windowMs = 15000) {
  const cutoff = Date.now() - windowMs;
  return samples.filter((sample) => sample.time >= cutoff);
}
