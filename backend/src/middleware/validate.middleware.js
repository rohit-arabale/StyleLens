/**
 * Zod Validation Middleware Factory.
 * Creates a middleware that validates request body, query, or params
 * against a Zod schema. Returns standardized ApiError on failure.
 *
 * @param {import("zod").ZodSchema} schema - Zod validation schema
 * @param {"body"|"query"|"params"} source - Which part of request to validate
 * @returns {Function} Express middleware
 *
 * @example
 * router.post("/tryon", validate(tryonSchema, "body"), controller.createTryon);
 */
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES, HTTP_STATUS } from "../constant.js";

const validate = (schema, source = "body") => {
    return (req, _res, next) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            const errors = result.error.errors.map((err) => ({
                field: err.path.join("."),
                message: err.message,
                code: err.code,
            }));

            return next(
                new ApiError(
                    HTTP_STATUS.UNPROCESSABLE_ENTITY,
                    ERROR_CODES.VALIDATION_ERROR,
                    "Validation failed. Check the errors array for details.",
                    errors
                )
            );
        }

        // Replace with parsed + coerced values
        req[source] = result.data;
        next();
    };
};

export { validate };
