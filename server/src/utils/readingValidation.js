function normalizeNumber(value) {
  return typeof value === "string" && value.trim() === "" ? Number.NaN : Number(value);
}

export function normalizeTimestamp(value) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeReadingInput(payload = {}) {
  return {
    timestamp: normalizeTimestamp(payload.timestamp),
    heartRate: normalizeNumber(payload.heartRate),
    spo2: normalizeNumber(payload.spo2),
    temperature: normalizeNumber(payload.temperature),
    motion: normalizeNumber(payload.motion),
    deviceId: typeof payload.deviceId === "string" && payload.deviceId.trim() ? payload.deviceId.trim() : "esp32-vitasense"
  };
}

export function validateReading(normalized) {
  if (!normalized.timestamp) {
    return "timestamp must be a valid date or ISO string.";
  }

  if ([normalized.heartRate, normalized.spo2, normalized.temperature, normalized.motion].some((value) => !Number.isFinite(value))) {
    return "heartRate, spo2, temperature, and motion must be numeric values.";
  }

  if (normalized.heartRate < 20 || normalized.heartRate > 260) {
    return "heartRate must be between 20 and 260 BPM.";
  }

  if (normalized.spo2 < 50 || normalized.spo2 > 100) {
    return "spo2 must be between 50 and 100 percent.";
  }

  if (normalized.temperature < 30 || normalized.temperature > 45) {
    return "temperature must be between 30 and 45 Celsius.";
  }

  if (normalized.motion < 0 || normalized.motion > 20) {
    return "motion must be between 0 and 20.";
  }

  return null;
}
