/**
 * Health Routes (unauthenticated)
 * GET /api/v1/healthz
 * GET /api/v1/readyz
 */
import { Router } from "express";
import { healthz, readyz } from "../controllers/health.controller.js";

const router = Router();

router.get("/healthz", healthz);
router.get("/readyz", readyz);

export default router;
