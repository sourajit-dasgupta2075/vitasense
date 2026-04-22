import { HealthReading } from "../models/HealthReading.js";

function deriveCameraStatus({ bpm, qualityScore, stressIndex }) {
  if (!Number.isFinite(bpm)) return "insufficient-signal";
  if (qualityScore < 0.3) return "low-quality";
  if (bpm > 120 || stressIndex > 70) return "review";
  return "stable";
}

export async function cameraPredict(req, res, next) {
  try {
    const bpm = Number(req.body?.bpm);
    const qualityScore = Number(req.body?.qualityScore ?? 0);
    const stressIndex = Number(req.body?.stressIndex ?? 0);
    const faceAreaRatio = Number(req.body?.faceAreaRatio ?? 0);
    const samples = Array.isArray(req.body?.samples) ? req.body.samples : [];

    if (!Number.isFinite(bpm) || bpm < 35 || bpm > 210) {
      return res.status(400).json({ message: "bpm must be a numeric value between 35 and 210." });
    }

    const latestSensorReading = await HealthReading.findLatest();
    const deviation = latestSensorReading?.heartRate ? Math.abs(latestSensorReading.heartRate - bpm) : null;
    const fallbackToCamera = !latestSensorReading;
    const status = deriveCameraStatus({ bpm, qualityScore, stressIndex });

    return res.json({
      status,
      recommendation:
        status === "stable"
          ? "Camera pulse is stable enough for a quick wellness check."
          : status === "review"
            ? "Reading suggests review; compare with contact sensor data when available."
            : "Signal quality is low. Reposition the face and try again.",
      qualityBand: qualityScore > 0.62 ? "high" : qualityScore > 0.36 ? "medium" : "low",
      fallbackToCamera,
      hybridSummary: latestSensorReading
        ? {
            latestSensorHeartRate: latestSensorReading.heartRate,
            deviationFromSensor: deviation,
            agreement: deviation !== null && deviation <= 8 ? "aligned" : "diverging"
          }
        : {
            latestSensorHeartRate: null,
            deviationFromSensor: null,
            agreement: "camera-only"
          },
      samplesReceived: samples.length,
      faceCoverage: Number(faceAreaRatio.toFixed(3))
    });
  } catch (error) {
    return next(error);
  }
}
