/**
 * Rate Limiting Middleware.
 * Configurable per-IP and per-user rate limiting using express-rate-limit.
 */
import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES, HTTP_STATUS, RATE_LIMIT_CONFIG } from "../constant.js";

/**
 * General API rate limiter — per IP.
 */
const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
    max: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_IP,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (_req, _res, next) => {
        next(
            new ApiError(
                HTTP_STATUS.TOO_MANY_REQUESTS,
                ERROR_CODES.RATE_LIMIT,
                "Too many requests from this IP. Please try again later.",
                [{ retryAfter: Math.ceil(RATE_LIMIT_CONFIG.WINDOW_MS / 1000) }]
            )
        );
    },
});

/**
 * Try-on specific rate limiter — per authenticated user.
 * More restrictive than the general limiter.
 */
const tryonLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
    max: RATE_LIMIT_CONFIG.MAX_TRYONS_PER_USER,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || req.ip,
    handler: (_req, _res, next) => {
        next(
            new ApiError(
                HTTP_STATUS.TOO_MANY_REQUESTS,
                ERROR_CODES.RATE_LIMIT,
                "Try-on rate limit exceeded. Please wait before generating more try-ons.",
                [{ retryAfter: Math.ceil(RATE_LIMIT_CONFIG.WINDOW_MS / 1000) }]
            )
        );
    },
});

export { apiLimiter, tryonLimiter };
