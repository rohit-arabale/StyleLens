/**
 * JWT Authentication Middleware.
 * Verifies Bearer token from Authorization header,
 * attaches decoded userId to req.user.
 */
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES, HTTP_STATUS } from "../constant.js";

const authMiddleware = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new ApiError(
                HTTP_STATUS.UNAUTHORIZED,
                ERROR_CODES.UNAUTHORIZED,
                "Authentication token is required. Provide a Bearer token."
            );
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            throw new ApiError(
                HTTP_STATUS.UNAUTHORIZED,
                ERROR_CODES.UNAUTHORIZED,
                "Authentication token is malformed."
            );
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request
        req.user = {
            userId: decoded.userId || decoded.sub,
            email: decoded.email,
            role: decoded.role || "user",
        };

        next();
    } catch (error) {
        if (error instanceof ApiError) {
            return next(error);
        }

        if (error.name === "TokenExpiredError") {
            return next(
                new ApiError(
                    HTTP_STATUS.UNAUTHORIZED,
                    ERROR_CODES.UNAUTHORIZED,
                    "Authentication token has expired."
                )
            );
        }

        if (error.name === "JsonWebTokenError") {
            return next(
                new ApiError(
                    HTTP_STATUS.UNAUTHORIZED,
                    ERROR_CODES.UNAUTHORIZED,
                    "Authentication token is invalid."
                )
            );
        }

        return next(
            new ApiError(
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                ERROR_CODES.INTERNAL_ERROR,
                "Authentication failed."
            )
        );
    }
};

export { authMiddleware };
