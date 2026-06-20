/**
 * Try-On Routes
 * POST /api/v1/tryon
 */
import { Router } from "express";
import { createTryon } from "../controllers/tryon.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { tryonLimiter } from "../middleware/rateLimit.middleware.js";
import { tryonSchema } from "../models/schemas.js";

const router = Router();

router.post(
    "/",
    authMiddleware,
    tryonLimiter,
    validate(tryonSchema, "body"),
    createTryon
);

export default router;
