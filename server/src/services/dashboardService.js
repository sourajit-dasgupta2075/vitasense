import { Alert } from "../models/Alert.js";
import { HealthReading } from "../models/HealthReading.js";
import { getPredictions } from "./predictionService.js";
import { resolveRange, getRangeWindow } from "../utils/range.js";

function createEmptyLatest() {
  return {
    heartRate: 0,
    spo2: 0,
    temperature: 0,
    motion: 0,
    healthScore: 0,
    status: "normal",
    anomaly: false,
    createdAt: new Date().toISOString()
  };
}

function enrichHistory(items) {
  return items.map((item, index, array) => {
    const previous = array[index - 1];
    const delta = previous ? item.heartRate - previous.heartRate : 0;
    const predictedHeartRate = Math.max(35, Math.min(220, Math.round(item.heartRate + delta * 0.7)));
    return { ...item, predictedHeartRate };
  });
}

function summarizeVitals(items, latest) {
  if (!items.length) {
    return {
      averageHeartRate: latest.heartRate ?? 0,
      minimumSpo2: latest.spo2 ?? 0,
      peakTemperature: latest.temperature ?? 0,
      anomalyCount: latest.anomaly ? 1 : 0
    };
  }

  return {
    averageHeartRate: Math.round(items.reduce((total, item) => total + item.heartRate, 0) / items.length),
    minimumSpo2: Math.min(...items.map((item) => item.spo2)),
    peakTemperature: Number(Math.max(...items.map((item) => item.temperature)).toFixed(1)),
    anomalyCount: items.filter((item) => item.anomaly).length
  };
}

function buildStableAlert(latest) {
  return {
    title: "Vitals stable",
    level: "normal",
    description:
      latest.status === "normal"
        ? "Current session remains within expected thresholds."
        : "No persisted alerts were found, but recent readings should still be reviewed.",
    createdAt: latest.createdAt
  };
}

export async function buildDashboardSnapshot(rawRange, options = {}) {
  const { includePredictions = true } = options;
  const range = resolveRange(rawRange);
  const minutes = getRangeWindow(range);
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  const [latestRaw, historyRaw, alertsRaw] = await Promise.all([
    HealthReading.findLatest(),
    HealthReading.findSince(since),
    Alert.findRecent(10)
  ]);

  const latest = latestRaw || createEmptyLatest();
  const history = enrichHistory(historyRaw);
  const alerts = alertsRaw.length ? alertsRaw : [buildStableAlert(latest)];

  return {
    fetchedAt: new Date().toISOString(),
    latest,
    history: {
      range,
      items: history,
      summary: summarizeVitals(history, latest)
    },
    predictions: includePredictions ? await getPredictions(history.length ? history : [latest]) : undefined,
    alerts: {
      alerts
    }
  };
}
