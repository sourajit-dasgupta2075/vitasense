import { Router } from "express";
import { getMe, login, logout, register } from "../controllers/authController.js";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", getMe);
router.post("/auth/logout", logout);

export default router;
