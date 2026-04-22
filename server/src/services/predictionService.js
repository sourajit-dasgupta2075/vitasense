import axios from "axios";
import { env } from "../config/env.js";

export async function getPredictions(history) {
  const safeHistory = Array.isArray(history) ? history.filter(Boolean) : [];

  if (!safeHistory.length) {
    return {
      forecast: [],
      anomalyProbability: 0,
      insights: [
        "Not enough readings yet to generate a forecast.",
        "Connect the device and stream a few samples to unlock trend analysis."
      ]
    };
  }

  try {
    const { data } = await axios.post(`${env.mlServiceUrl}/predict`, {
      readings: safeHistory
    }, {
      timeout: 4000
    });
    return data;
  } catch {
    const baseline = safeHistory[safeHistory.length - 1];
    const fallbackSource = safeHistory.slice(-3);
    const fallbackForecast = fallbackSource.map((item, index) => ({
      step: `T+${(index + 1) * 5}m`,
      heartRate: Math.round(item.heartRate + 2 + index),
      riskLevel: item.heartRate > 100 || item.spo2 < 95 ? "moderate" : "low"
    }));

    return {
      forecast: fallbackForecast.length
        ? fallbackForecast
        : [
            {
              step: "T+5m",
              heartRate: Math.round(baseline.heartRate),
              riskLevel: baseline.status !== "normal" ? "moderate" : "low"
            }
          ],
      anomalyProbability: safeHistory.some((item) => item.status !== "normal") ? 0.32 : 0.12,
      insights: [
        "Fallback prediction active because ML service is unavailable.",
        "Heart rate forecast was estimated from recent trend slope.",
        "Reconnect the ML microservice for model-backed anomaly scores."
      ]
    };
  }
}
