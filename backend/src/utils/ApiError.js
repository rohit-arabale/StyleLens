/**
 * Custom API Error class for standardized error handling.
 * Extends the native Error class to include HTTP status codes,
 * application-specific error codes, and optional detail arrays.
 *
 * @example
 * throw new ApiError(400, "INVALID_IMAGE", "Image format is not supported");
 * throw new ApiError(429, "RATE_LIMIT", "Too many requests", [{ retryAfter: 60 }]);
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g., 400, 401, 404, 500)
   * @param {string} code - Application-specific error code (e.g., "INVALID_IMAGE")
   * @param {string} [message="Something went wrong"] - Human-readable error message
   * @param {Array} [errors=[]] - Optional array of additional error details
   * @param {string} [stack=""] - Optional custom stack trace
   */
  constructor(
    statusCode,
    code = "INTERNAL_ERROR",
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.message = message;
    this.errors = errors;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize the error for JSON responses.
   * @returns {object}
   */
  toJSON() {
    return {
      success: this.success,
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
      errors: this.errors,
    };
  }
}

export { ApiError };
