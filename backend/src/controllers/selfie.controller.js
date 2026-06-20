/**
 * Selfie Controller — handles POST /api/v1/selfie
 *
 * Accepts multipart/form-data or JSON base64.
 * Validates face presence, stores original + normalized 1024x1024.
 */
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { storageService } from "../services/storage.service.js";
import { dbService } from "../services/db.service.js";
import { HTTP_STATUS, ERROR_CODES } from "../constant.js";
import { parseDataUri, isValidImageType, isValidImageSize } from "../utils/helpers.js";
import { visionService } from "../services/vision.service.js";

/**
 * POST /api/v1/selfie
 * Upload a selfie image.
 */
const uploadSelfie = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    let selfieBytes;
    let mimeType;

    // Handle multipart file upload
    if (req.file) {
        selfieBytes = req.file.buffer;
        mimeType = req.file.mimetype;
    }
    // Handle JSON base64 body
    else if (req.body?.selfieImage) {
        const parsed = parseDataUri(req.body.selfieImage);
        if (parsed) {
            selfieBytes = parsed.buffer;
            mimeType = parsed.mimeType;
        } else {
            // Assume raw base64
            selfieBytes = Buffer.from(req.body.selfieImage, "base64");
            mimeType = "image/png"; // Default assumption for raw base64
        }
    }

    if (!selfieBytes || selfieBytes.length === 0) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_IMAGE,
            "Selfie image is required. Upload via multipart form (field: 'image') or JSON body (field: 'selfieImage')."
        );
    }

    // Validate type
    if (!isValidImageType(mimeType)) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.UNSUPPORTED_TYPE,
            `Unsupported image type: ${mimeType}. Only JPEG and PNG are allowed.`
        );
    }

    // Validate size
    if (!isValidImageSize(selfieBytes.length)) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_IMAGE,
            "Image size exceeds the maximum allowed size (5MB)."
        );
    }

    // Validate face presence
    const personDesc = await visionService.personParse(selfieBytes);
    if (!personDesc.faceDetected) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.FACE_MISSING,
            "No face detected. Please upload a clear, front-facing selfie."
        );
    }

    // Ensure user exists
    await dbService.getOrCreateUser(userId, req.user.email);

    // Save to GCS
    const { selfieUrl, selfieHash } = await storageService.saveSelfie({
        userId,
        selfieBytes,
    });

    // Update user document
    await dbService.updateUserSelfie(userId, selfieUrl, selfieHash);

    return res
        .status(HTTP_STATUS.CREATED)
        .json(
            new ApiResponse(
                HTTP_STATUS.CREATED,
                { selfieUrl, selfieHash },
                "Selfie uploaded successfully"
            )
        );
});

export { uploadSelfie };
