import { Alert } from "../models/Alert.js";
import { HealthReading } from "../models/HealthReading.js";
import { maybeCreateAlerts } from "../services/alertService.js";
import { buildDashboardSnapshot } from "../services/dashboardService.js";
import { getPredictions } from "../services/predictionService.js";
import { calculateHealthScore, deriveStatus } from "../services/scoreService.js";
import { resolveRange } from "../utils/range.js";
import { normalizeReadingInput, validateReading } from "../utils/readingValidation.js";

export async function createReading(req, res, next) {
  try {
    const normalized = normalizeReadingInput(req.body);
    const validationMessage = validateReading(normalized);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    normalized.healthScore = calculateHealthScore(normalized);
    normalized.status = deriveStatus(normalized);
    normalized.anomaly = normalized.status !== "normal";

    const reading = await HealthReading.create(normalized);
    const alerts = await maybeCreateAlerts(reading);
    return res.status(201).json({ reading, alerts });
  } catch (error) {
    return next(error);
  }
}

export async function getLatest(req, res, next) {
  try {
    const latest = await HealthReading.findLatest();
    return res.json({
      latest:
        latest || {
          heartRate: 0,
          spo2: 0,
          temperature: 0,
          motion: 0,
          healthScore: 0,
          status: "normal",
          anomaly: false,
          createdAt: new Date().toISOString()
        }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getHistory(req, res, next) {
  try {
    const snapshot = await buildDashboardSnapshot(req.query.range, { includePredictions: false });
    return res.json(snapshot.history);
  } catch (error) {
    return next(error);
  }
}

export async function getPredictionsController(req, res, next) {
  try {
    const snapshot = await buildDashboardSnapshot(resolveRange(req.query.range));
    return res.json(snapshot.predictions);
  } catch (error) {
    return next(error);
  }
}

export async function getAlerts(req, res, next) {
  try {
    const alerts = await Alert.findRecent(10);
    if (alerts.length) {
      return res.json({ alerts });
    }

    const latest = await HealthReading.findLatest();
    return res.json({
      alerts: [
        {
          title: "Vitals stable",
          level: "normal",
          description: "No recent alert events were generated.",
          createdAt: latest?.createdAt || new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDashboardSnapshot(req, res, next) {
  try {
    const snapshot = await buildDashboardSnapshot(req.query.range);
    return res.json(snapshot);
  } catch (error) {
    return next(error);
  }
}
