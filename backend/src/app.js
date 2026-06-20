/**
 * Express Application Configuration.
 *
 * Wires up all middleware and routes in the correct order:
 * 1. Security (helmet, CORS)
 * 2. Parsing (JSON, URL-encoded)
 * 3. Logging (morgan + custom request logging)
 * 4. Rate limiting (global)
 * 5. Routes (API v1)
 * 6. 404 handler
 * 7. Error handler (MUST be last)
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { loggingMiddleware } from "./middleware/logging.middleware.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { ApiError } from "./utils/ApiError.js";
import { HTTP_STATUS, ERROR_CODES } from "./constant.js";
import routes from "./routes/index.js";

const app = express();

// ─── 1. Security Headers ───────────────────────────────────────
app.use(helmet());

// ─── 2. CORS ────────────────────────────────────────────────────
app.use(
    cors({
        origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Request-Id",
            "Idempotency-Key",
        ],
    })
);

// ─── 3. Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: "10mb" })); // Support base64 images in JSON body
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── 4. HTTP Request Logger (Morgan) ────────────────────────────
if (process.env.NODE_ENV !== "test") {
    app.use(
        morgan("short", {
            skip: (req) => req.url === "/api/v1/healthz", // Don't log health checks
        })
    );
}

// ─── 5. Custom Request Logging (requestId injection) ────────────
app.use(loggingMiddleware);

// ─── 6. Global Rate Limiter ────────────────────────────────────
app.use(apiLimiter);

// ─── 7. API Routes ─────────────────────────────────────────────
app.use("/api/v1", routes);

// ─── 8. Root Endpoint ──────────────────────────────────────────
app.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Virtual Try-On API v1",
        docs: "/api/v1/readyz",
        version: "1.0.0",
    });
});

// ─── 9. 404 Handler ────────────────────────────────────────────
app.use((_req, _res, next) => {
    next(
        new ApiError(
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.NOT_FOUND,
            "The requested resource was not found."
        )
    );
});

// ─── 10. Centralized Error Handler (MUST be last) ──────────────
app.use(errorMiddleware);

export { app };
