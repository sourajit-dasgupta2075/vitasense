import { HealthReading } from "./models/HealthReading.js";
import { calculateHealthScore, deriveStatus } from "./services/scoreService.js";

export async function seedReadings() {
  const count = await HealthReading.countDocuments();
  if (count > 0) return;

  const docs = Array.from({ length: 120 }).map((_, index) => {
    const timestamp = new Date(Date.now() - (119 - index) * 30 * 1000);
    const heartRate = 82 + Math.round(Math.sin(index / 7) * 9 + Math.random() * 5);
    const spo2 = 96 + Math.round(Math.random() * 2);
    const temperature = Number((36.4 + Math.random() * 0.6).toFixed(1));
    const motion = Number((Math.random() * 1.7).toFixed(2));
    const base = { timestamp, heartRate, spo2, temperature, motion };
    return {
      ...base,
      healthScore: calculateHealthScore(base),
      status: deriveStatus(base),
      anomaly: false
    };
  });

  await HealthReading.insertMany(docs);
}
