import crypto from "crypto";
import { IMAGE_TYPES, LIMITS } from "../constant.js";

/**
 * Generate a SHA-256 hash of the given input buffer or string.
 * Used for garment/selfie deduplication and caching.
 *
 * @param {Buffer|string} input
 * @returns {string} hex-encoded SHA-256 hash
 */
export const generateHash = (input) => {
    return crypto.createHash("sha256").update(input).digest("hex");
};

/**
 * Generate a unique job ID for generation tracking.
 * Format: tryon_{timestamp}_{randomHex}
 *
 * @returns {string}
 */
export const generateJobId = () => {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString("hex");
    return `tryon_${timestamp}_${random}`;
};

/**
 * Generate a unique request ID for tracing.
 *
 * @returns {string}
 */
export const generateRequestId = () => {
    return `req_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
};

/**
 * Validate that the provided MIME type is in the allowlist.
 *
 * @param {string} mimeType - e.g., "image/jpeg", "image/png"
 * @returns {boolean}
 */
export const isValidImageType = (mimeType) => {
    return IMAGE_TYPES.includes(mimeType);
};

/**
 * Validate image size against the configured max limit.
 *
 * @param {number} sizeBytes - Size in bytes
 * @returns {boolean}
 */
export const isValidImageSize = (sizeBytes) => {
    return sizeBytes > 0 && sizeBytes <= LIMITS.MAX_IMAGE_SIZE;
};

/**
 * Parse base64 data URI and extract buffer + mime type.
 *
 * @param {string} dataUri - e.g., "data:image/jpeg;base64,/9j/4AAQ..."
 * @returns {{ buffer: Buffer, mimeType: string } | null}
 */
export const parseDataUri = (dataUri) => {
    const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;

    return {
        mimeType: match[1],
        buffer: Buffer.from(match[2], "base64"),
    };
};

/**
 * Encode a Firestore document snapshot into a cursor string.
 *
 * @param {object} doc - Document data with createdAt
 * @returns {string} Base64-encoded cursor
 */
export const encodeCursor = (doc) => {
    const payload = JSON.stringify({
        createdAt: doc.createdAt,
        id: doc.id,
    });
    return Buffer.from(payload).toString("base64url");
};

/**
 * Decode a pagination cursor string.
 *
 * @param {string} cursor - Base64-encoded cursor
 * @returns {object | null} { createdAt, id }
 */
export const decodeCursor = (cursor) => {
    try {
        const payload = Buffer.from(cursor, "base64url").toString("utf-8");
        return JSON.parse(payload);
    } catch {
        return null;
    }
};

/**
 * Calculate expiration timestamp from now.
 *
 * @param {number} minutes - TTL in minutes
 * @returns {Date}
 */
export const getExpiresAt = (minutes = 60) => {
    return new Date(Date.now() + minutes * 60 * 1000);
};
