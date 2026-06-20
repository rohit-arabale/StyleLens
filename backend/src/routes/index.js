/**
 * Route Index — barrel export that mounts all route groups
 * under the /api/v1 namespace.
 */
import { Router } from "express";
import tryonRoutes from "./tryon.routes.js";
import historyRoutes from "./history.routes.js";
import selfieRoutes from "./selfie.routes.js";
import accountRoutes from "./account.routes.js";
import healthRoutes from "./health.routes.js";

const router = Router();

// ─── API v1 Routes ──────────────────────────────────────────────
router.use("/tryon", tryonRoutes);
router.use("/history", historyRoutes);
router.use("/selfie", selfieRoutes);
router.use("/account", accountRoutes);

// Health routes don't need /api/v1 prefix, but we mount them here
// for consistency — they'll be accessible at /api/v1/healthz and /api/v1/readyz
router.use("/", healthRoutes);

export default router;
