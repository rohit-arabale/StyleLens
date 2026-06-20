/**
 * Standardized API Response wrapper.
 * Ensures all successful responses follow a consistent format
 * across the entire application.
 *
 * @example
 * res.status(200).json(new ApiResponse(200, data, "Tryon completed successfully"));
 * res.status(201).json(new ApiResponse(201, user, "Selfie uploaded"));
 * res.status(202).json(new ApiResponse(202, null, "Account deletion initiated"));
 */
class ApiResponse {
    /**
     * @param {number} statusCode - HTTP status code
     * @param {any} data - Response payload (object, array, null)
     * @param {string} [message="Success"] - Human-readable success message
     * @param {object} [meta={}] - Optional metadata (pagination, timing, etc.)
     */
    constructor(statusCode, data, message = "Success", meta = {}) {
        this.success = statusCode < 400;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;

        // Only include meta if it has properties
        if (Object.keys(meta).length > 0) {
            this.meta = meta;
        }
    }
}

export { ApiResponse };
