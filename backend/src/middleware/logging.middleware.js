/**
 * Request Logging Middleware.
 * Attaches a unique requestId to each request and logs
 * structured data for observability.
 */
import { generateRequestId } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

const loggingMiddleware = (req, res, next) => {
    // Attach unique request ID
    req.requestId = req.headers["x-request-id"] || generateRequestId();
    res.setHeader("X-Request-Id", req.requestId);

    // Record start time
    const startTime = Date.now();

    // Log on response finish
    res.on("finish", () => {
        const duration = Date.now() - startTime;

        const logData = {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            userId: req.user?.userId,
        };

        if (res.statusCode >= 400) {
            logger.warn("Request completed with error", logData);
        } else {
            logger.info("Request completed", logData);
        }
    });

    next();
};

export { loggingMiddleware };
