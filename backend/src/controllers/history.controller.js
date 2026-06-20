/**
 * History Controller — handles GET /api/v1/history and DELETE /api/v1/history/:jobId
 */
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { dbService } from "../services/db.service.js";
import { HTTP_STATUS, ERROR_CODES } from "../constant.js";

/**
 * GET /api/v1/history
 * List paginated history for authenticated user.
 */
const listHistory = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { limit, cursor, category, source, from, to } = req.query;

    const result = await dbService.listHistory(userId, {
        limit: parseInt(limit) || 20,
        cursor,
        category,
        source,
        from,
        to,
    });

    return res
        .status(HTTP_STATUS.OK)
        .json(
            new ApiResponse(HTTP_STATUS.OK, result.items, "History retrieved successfully", {
                nextCursor: result.nextCursor,
                count: result.items.length,
            })
        );
});

/**
 * DELETE /api/v1/history/:jobId
 * Delete a history item (soft-delete).
 */
const deleteHistoryItem = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { jobId } = req.params;

    if (!jobId) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR,
            "Job ID is required."
        );
    }

    const deleted = await dbService.deleteHistoryItem(userId, jobId);

    if (!deleted) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.NOT_FOUND,
            "History item not found."
        );
    }

    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, null, "History item deleted successfully"));
});

export { listHistory, deleteHistoryItem };
