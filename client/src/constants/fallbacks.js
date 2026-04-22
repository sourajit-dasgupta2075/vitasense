function createHistoryItems() {
  return Array.from({ length: 16 }).map((_, index) => ({
    timestamp: new Date(Date.now() - (15 - index) * 4 * 60 * 1000).toISOString(),
    heartRate: 69 + Math.round(Math.random() * 11),
    spo2: 96 + Math.round(Math.random() * 2),
    temperature: Number((36.4 + Math.random() * 0.7).toFixed(1)),
    motion: Number((Math.random() * 1.6).toFixed(2)),
    healthScore: 80 + Math.round(Math.random() * 12),
    predictedHeartRate: 71 + Math.round(Math.random() * 10),
    anomaly: Math.random() > 0.9,
    status: "normal"
  }));
}

export function createFallbackSnapshot(range = "1h") {
  const items = createHistoryItems();

  return {
    fetchedAt: new Date().toISOString(),
    latest: {
      heartRate: 72,
      spo2: 98,
      temperature: 36.8,
      motion: 0.08,
      healthScore: 88,
      status: "normal",
      createdAt: new Date().toISOString(),
      anomaly: false
    },
    history: {
      range,
      items,
      summary: {
        averageHeartRate: 76,
        minimumSpo2: 96,
        peakTemperature: 37.0,
        anomalyCount: items.filter((item) => item.anomaly).length
      }
    },
    predictions: {
      forecast: [
        { step: "T+5m", heartRate: 74, riskLevel: "low" },
        { step: "T+10m", heartRate: 77, riskLevel: "low" },
        { step: "T+15m", heartRate: 81, riskLevel: "moderate" }
      ],
      anomalyProbability: 0.14,
      insights: [
        "Demo data is active because the live API is unavailable.",
        "Heart rate remains in a stable zone with mild variation.",
        "Reconnect the backend to restore model-backed insights."
      ]
    },
    alerts: {
      alerts: [
        {
          title: "Vitals stable",
          level: "normal",
          description: "Current session remains within expected clinical thresholds.",
          createdAt: new Date().toISOString()
        },
        {
          title: "Hydration trend",
          level: "warning",
          description: "Hydration index is improving but still benefits from monitoring.",
          createdAt: new Date().toISOString()
        }
      ]
    }
  };
}
