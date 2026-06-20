/**
 * Centralized Error Handler Middleware.
 * Catches all errors thrown/forwarded from controllers and middleware,
 * transforms them into standardized ApiError responses.
 *
 * MUST be the LAST middleware registered in the Express app.
 */
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import { ERROR_CODES, HTTP_STATUS } from "../constant.js";

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, _next) => {
    // Log the error with context
    const logContext = {
        requestId: req.requestId,
        userId: req.user?.userId,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
    };

    // If it's already an ApiError, use it directly
    if (err instanceof ApiError) {
        logger.error(err.message, { ...logContext, code: err.code, statusCode: err.statusCode });

        return res.status(err.statusCode).json(err.toJSON());
    }

    // Handle Multer errors (file upload)
    if (err.code === "LIMIT_FILE_SIZE") {
        const apiError = new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_IMAGE,
            "File size exceeds the maximum allowed size (5MB)."
        );
        logger.warn(apiError.message, logContext);
        return res.status(apiError.statusCode).json(apiError.toJSON());
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
        const apiError = new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR,
            "Unexpected file field in the upload."
        );
        logger.warn(apiError.message, logContext);
        return res.status(apiError.statusCode).json(apiError.toJSON());
    }

    // Handle JWT errors (shouldn't normally reach here, but just in case)
    if (err.name === "UnauthorizedError" || err.name === "JsonWebTokenError") {
        const apiError = new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            ERROR_CODES.UNAUTHORIZED,
            "Invalid or expired authentication token."
        );
        logger.warn(apiError.message, logContext);
        return res.status(apiError.statusCode).json(apiError.toJSON());
    }

    // Handle Zod validation errors (if they bypass validate middleware)
    if (err.name === "ZodError") {
        const apiError = new ApiError(
            HTTP_STATUS.UNPROCESSABLE_ENTITY,
            ERROR_CODES.VALIDATION_ERROR,
            "Validation failed.",
            err.errors?.map((e) => ({ field: e.path.join("."), message: e.message }))
        );
        logger.warn(apiError.message, logContext);
        return res.status(apiError.statusCode).json(apiError.toJSON());
    }

    // Unhandled/unknown errors — treat as INTERNAL_ERROR
    logger.error("Unhandled error", {
        ...logContext,
        error: err.message,
        stack: err.stack,
    });

    const internalError = new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        process.env.NODE_ENV === "production"
            ? "An unexpected error occurred. Please try again later."
            : err.message || "Internal Server Error"
    );

    return res.status(internalError.statusCode).json(internalError.toJSON());
};

export { errorMiddleware };
