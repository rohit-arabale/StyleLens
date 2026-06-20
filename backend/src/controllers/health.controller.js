/**
 * Health Controller — handles GET /api/v1/healthz and GET /api/v1/readyz
 *
 * healthz: Process liveness check (fast 200).
 * readyz: Dependency readiness (Firestore, GCS, model availability).
 */
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../constant.js";
import { logger } from "../utils/logger.js";

/**
 * GET /api/v1/healthz
 * Liveness probe — responds 200 if the process is alive.
 */
const healthz = asyncHandler(async (_req, res) => {
    return res
        .status(HTTP_STATUS.OK)
        .json(
            new ApiResponse(HTTP_STATUS.OK, {
                status: "healthy",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            })
        );
});

/**
 * GET /api/v1/readyz
 * Readiness probe — checks dependency availability.
 */
const readyz = asyncHandler(async (_req, res) => {
    const checks = {
        firestore: "unknown",
        storage: "unknown",
        model: "unknown",
    };

    // Check Firestore
    try {
        const { getDb } = await import("../db/index.js");
        const db = getDb();
        await db.collection("_health").limit(1).get();
        checks.firestore = "ready";
    } catch (error) {
        checks.firestore = "unavailable";
        logger.warn("Readyz: Firestore not available", { error: error.message });
    }

    // Check GCS
    try {
        const { getBucket } = await import("../db/index.js");
        const bucket = getBucket();
        if (bucket) {
            await bucket.exists();
            checks.storage = "ready";
        } else {
            checks.storage = "not_configured";
        }
    } catch (error) {
        checks.storage = "unavailable";
        logger.warn("Readyz: GCS not available", { error: error.message });
    }

    // Model availability (placeholder — will check API quotas)
    checks.model = "available";

    const allReady = Object.values(checks).every(
        (v) => v === "ready" || v === "available"
    );

    const statusCode = allReady
        ? HTTP_STATUS.OK
        : HTTP_STATUS.SERVICE_UNAVAILABLE;

    return res
        .status(statusCode)
        .json(
            new ApiResponse(statusCode, {
                status: allReady ? "ready" : "degraded",
                checks,
                timestamp: new Date().toISOString(),
            })
        );
});

export { healthz, readyz };
