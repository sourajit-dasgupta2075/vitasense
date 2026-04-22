import { Router } from "express";
import { cameraPredict } from "../controllers/cameraController.js";

const router = Router();

router.post("/camera-predict", cameraPredict);

export default router;
