/**
 * Account Controller — handles POST /api/v1/account/delete
 *
 * Triggers cascade deletion of all user data.
 * Returns 202 Accepted (async operation).
 */
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { accountService } from "../services/account.service.js";
import { HTTP_STATUS } from "../constant.js";

/**
 * POST /api/v1/account/delete
 * Initiate account deletion.
 */
const deleteAccount = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    // Fire-and-forget the deletion (responds immediately with 202)
    // In production, this could be an async job/queue
    accountService.cascadeDelete(userId).catch((error) => {
        // Log but don't throw — user already received 202
        console.error("Background cascade deletion failed:", error);
    });

    return res
        .status(HTTP_STATUS.ACCEPTED)
        .json(
            new ApiResponse(
                HTTP_STATUS.ACCEPTED,
                { userId },
                "Account deletion initiated. All data will be removed shortly."
            )
        );
});

export { deleteAccount };
