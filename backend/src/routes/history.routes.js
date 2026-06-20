/**
 * History Routes
 * GET  /api/v1/history
 * DELETE /api/v1/history/:jobId
 */
import { Router } from "express";
import { listHistory, deleteHistoryItem } from "../controllers/history.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { historyQuerySchema } from "../models/schemas.js";

const router = Router();

router.get(
    "/",
    authMiddleware,
    validate(historyQuerySchema, "query"),
    listHistory
);

router.delete(
    "/:jobId",
    authMiddleware,
    deleteHistoryItem
);

export default router;
