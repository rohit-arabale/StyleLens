/**
 * Try-On Controller — handles POST /api/v1/tryon
 *
 * Thin controller: validates input, delegates to tryonService,
 * returns standardized response.
 */
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { tryonService } from "../services/tryon.service.js";
import { HTTP_STATUS, ERROR_CODES } from "../constant.js";

/**
 * POST /api/v1/tryon
 * Create a virtual try-on generation.
 */
const createTryon = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { garmentImage, garmentUrl, options, client, idempotencyKey } = req.body;

    if (!garmentImage && !garmentUrl) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_IMAGE,
            "Either garmentImage (base64) or garmentUrl must be provided."
        );
    }

    const result = await tryonService.processTryon({
        userId,
        garmentImage,
        garmentUrl,
        options,
        idempotencyKey,
        source: client?.source || "web",
    });

    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, result, "Try-on generated successfully"));
});

export { createTryon };
