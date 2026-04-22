import { Router } from "express";
import { createReading, getAlerts, getDashboardSnapshot, getHistory, getLatest, getPredictionsController } from "../controllers/dataController.js";

const router = Router();

router.post("/data", createReading);
router.get("/data", getLatest);
router.get("/dashboard", getDashboardSnapshot);
router.get("/history", getHistory);
router.get("/predictions", getPredictionsController);
router.get("/alerts", getAlerts);

export default router;
