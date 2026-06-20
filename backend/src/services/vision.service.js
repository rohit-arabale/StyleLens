/**
 * Vision Service — garment and person image analysis.
 *
 * Handles:
 * - Garment parsing: bbox, segmentation, occlusion, attributes, color, pattern, view angle
 * - Person parsing: face detect, pose landmarks, lighting, skin tone, accessories
 *
 * Currently provides a structured interface; integrate with Vertex AI / Cloud Vision
 * or Gemini Vision when ready.
 */
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES, HTTP_STATUS, LIMITS } from "../constant.js";
import { logger } from "../utils/logger.js";

/**
 * Parse a garment image to extract attributes for prompting.
 *
 * @param {Buffer} imageBuffer - Raw image bytes
 * @returns {Promise<object>} Garment description
 */
const garmentParse = async (imageBuffer) => {
    try {
        logger.info("Vision: Parsing garment image", {
            size: imageBuffer.length,
        });

        // TODO: Integrate with Gemini Vision API or Cloud Vision
        // For now, return a structured placeholder that downstream services expect
        const garmentDesc = {
            category: "garment",
            color: "detected",
            pattern: "solid",
            material: "fabric",
            fit: "regular",
            occlusionScore: 0.1,
            viewAngle: 0,
            bbox: { x: 0, y: 0, width: 0, height: 0 },
            confidence: 0.9,
        };

        // Validate occlusion threshold
        if (garmentDesc.occlusionScore > LIMITS.OCCLUSION_THRESHOLD) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.GARMENT_OCCLUDED,
                `Garment is too occluded (score: ${garmentDesc.occlusionScore}). Please use a clearer image.`
            );
        }

        // Validate view angle
        if (garmentDesc.viewAngle > LIMITS.MAX_VIEW_ANGLE) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.SIDE_VIEW,
                `Garment image is at too steep an angle (${garmentDesc.viewAngle}°). Please use a front-view image.`
            );
        }

        return garmentDesc;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error("Vision: Garment parse failed", { error: error.message });
        throw new ApiError(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            ERROR_CODES.INTERNAL_ERROR,
            "Failed to analyze garment image."
        );
    }
};

/**
 * Parse a person/selfie image to extract attributes for prompting.
 *
 * @param {Buffer} selfieBuffer - Raw selfie image bytes
 * @returns {Promise<object>} Person description
 */
const personParse = async (selfieBuffer) => {
    try {
        logger.info("Vision: Parsing person image", {
            size: selfieBuffer.length,
        });

        // TODO: Integrate with face detection / pose estimation API
        const personDesc = {
            faceDetected: true,
            faceCount: 1,
            skinTone: "medium",
            bodyType: "average",
            pose: "standing front",
            lighting: "natural",
            hairStyle: "short",
            accessories: "none",
            headTilt: 0,
            shoulderWidth: "medium",
            confidence: 0.9,
        };

        // Validate face presence
        if (!personDesc.faceDetected || personDesc.faceCount === 0) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.FACE_MISSING,
                "No face detected in the selfie. Please upload a clear front-facing photo."
            );
        }

        if (personDesc.faceCount > 1) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.FACE_MISSING,
                "Multiple faces detected. Please upload a selfie with only one person."
            );
        }

        return personDesc;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error("Vision: Person parse failed", { error: error.message });
        throw new ApiError(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            ERROR_CODES.INTERNAL_ERROR,
            "Failed to analyze selfie image."
        );
    }
};

export const visionService = { garmentParse, personParse };
