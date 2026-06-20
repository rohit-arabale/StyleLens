/**
 * Storage Service — manage GCS file uploads for selfies and generations.
 *
 * Handles:
 * - Saving full-res + thumbnail generation images
 * - Saving selfies (original + normalized 1024x1024)
 * - Generating signed URLs with configurable TTL
 * - Deleting files (for account cascade deletion)
 */
import sharp from "sharp";
import { getBucket } from "../db/index.js";
import { BUCKET_PATHS, LIMITS } from "../constant.js";
import { logger } from "../utils/logger.js";
import { generateHash } from "../utils/helpers.js";

/**
 * Save a generated try-on image (full + thumbnail) to GCS.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.jobId
 * @param {Buffer} params.imageBytes - Full-resolution image
 * @returns {Promise<{ fullUrl: string, thumbUrl: string, previewUrl: string }>}
 */
const saveGeneration = async ({ userId, jobId, imageBytes }) => {
    try {
        const bucket = getBucket();

        // Full resolution
        const fullPath = `${BUCKET_PATHS.GENERATIONS_FULL}/${userId}/${jobId}.png`;
        const fullFile = bucket.file(fullPath);
        await fullFile.save(imageBytes, {
            metadata: { contentType: "image/png" },
            resumable: false,
        });

        // Generate thumbnail at 512px
        const thumbBytes = await sharp(imageBytes)
            .resize(LIMITS.THUMB_SIZE, LIMITS.THUMB_SIZE, { fit: "inside" })
            .png()
            .toBuffer();

        const thumbPath = `${BUCKET_PATHS.GENERATIONS_THUMBS}/${userId}/${jobId}.png`;
        const thumbFile = bucket.file(thumbPath);
        await thumbFile.save(thumbBytes, {
            metadata: { contentType: "image/png" },
            resumable: false,
        });

        // Generate signed URLs
        const [fullUrl] = await fullFile.getSignedUrl({
            action: "read",
            expires: Date.now() + LIMITS.SIGNED_URL_TTL_MINUTES * 60 * 1000,
        });

        const [thumbUrl] = await thumbFile.getSignedUrl({
            action: "read",
            expires: Date.now() + LIMITS.SIGNED_URL_TTL_MINUTES * 60 * 1000,
        });

        logger.info("Storage: Generation saved", { userId, jobId });

        return {
            fullUrl,
            thumbUrl,
            previewUrl: thumbUrl, // Default preview is the thumbnail
        };
    } catch (error) {
        logger.error("Storage: Failed to save generation", {
            userId,
            jobId,
            error: error.message,
        });
        throw error;
    }
};

/**
 * Save a selfie image — original + normalized 1024x1024.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {Buffer} params.selfieBytes
 * @returns {Promise<{ selfieUrl: string, selfieHash: string }>}
 */
const saveSelfie = async ({ userId, selfieBytes }) => {
    try {
        const bucket = getBucket();

        // Normalize to 1024x1024
        const normalizedBytes = await sharp(selfieBytes)
            .resize(LIMITS.SELFIE_NORMALIZED_SIZE, LIMITS.SELFIE_NORMALIZED_SIZE, {
                fit: "cover",
                position: "top",
            })
            .png()
            .toBuffer();

        const selfieHash = generateHash(normalizedBytes);
        const selfiePath = `${BUCKET_PATHS.SELFIES}/${userId}/selfie_${selfieHash}.png`;
        const selfieFile = bucket.file(selfiePath);

        await selfieFile.save(normalizedBytes, {
            metadata: { contentType: "image/png" },
            resumable: false,
        });

        const [selfieUrl] = await selfieFile.getSignedUrl({
            action: "read",
            expires: Date.now() + LIMITS.SIGNED_URL_TTL_MINUTES * 60 * 1000,
        });

        logger.info("Storage: Selfie saved", { userId, selfieHash });

        return { selfieUrl, selfieHash };
    } catch (error) {
        logger.error("Storage: Failed to save selfie", {
            userId,
            error: error.message,
        });
        throw error;
    }
};

/**
 * Delete all files for a user from GCS (cascade deletion).
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
const deleteUserFiles = async (userId) => {
    try {
        const bucket = getBucket();

        // Delete from all buckets
        const prefixes = [
            `${BUCKET_PATHS.SELFIES}/${userId}/`,
            `${BUCKET_PATHS.GENERATIONS_FULL}/${userId}/`,
            `${BUCKET_PATHS.GENERATIONS_THUMBS}/${userId}/`,
        ];

        for (const prefix of prefixes) {
            await bucket.deleteFiles({ prefix, force: true });
        }

        logger.info("Storage: User files deleted", { userId });
    } catch (error) {
        logger.error("Storage: Failed to delete user files", {
            userId,
            error: error.message,
        });
        throw error;
    }
};

export const storageService = { saveGeneration, saveSelfie, deleteUserFiles };
