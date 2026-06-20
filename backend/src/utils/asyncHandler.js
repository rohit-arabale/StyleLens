/**
 * Higher-order function that wraps async route handlers
 * to automatically catch errors and forward them to Express error middleware.
 *
 * Eliminates the need for try-catch blocks in every controller.
 *
 * @param {Function} fn - Async function (req, res, next) => Promise<void>
 * @returns {Function} Express middleware
 *
 * @example
 * router.post("/tryon", asyncHandler(tryonController.createTryon));
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export { asyncHandler };
