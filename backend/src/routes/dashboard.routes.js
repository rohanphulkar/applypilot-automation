import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";

const router = Router();

// GET /api/dashboard -> Dashboard statistics & active overview
router.get("/", getDashboardStats);

export default router;
