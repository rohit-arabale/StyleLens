/**
 * Google Cloud Storage client initialization.
 * Provides a configured GCS bucket instance for file operations.
 *
 * Configuration:
 * - GCS_BUCKET_NAME: Storage bucket name
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account (if using)
 */
import { Storage } from "@google-cloud/storage";
import { logger } from "../utils/logger.js";

let storageClient = null;
let bucket = null;

/**
 * Initialize GCS client and bucket reference.
 * Safe to call multiple times — returns cached instances.
 *
 * @returns {{ storage: Storage, bucket: import("@google-cloud/storage").Bucket }}
 */
const initializeStorage = () => {
    if (storageClient && bucket) {
        return { storage: storageClient, bucket };
    }

    try {
        const config = {
            projectId: process.env.FIREBASE_PROJECT_ID,
        };

        storageClient = new Storage(config);
        const bucketName = process.env.GCS_BUCKET_NAME;

        if (!bucketName) {
            logger.warn("⚠️  GCS_BUCKET_NAME not set — storage operations will fail");
        } else {
            bucket = storageClient.bucket(bucketName);
            logger.info("✅ GCS Storage initialized", { bucket: bucketName });
        }
    } catch (error) {
        logger.error("❌ GCS Storage initialization failed", {
            error: error.message,
        });
        throw error;
    }

    return { storage: storageClient, bucket };
};

/**
 * Get the configured GCS bucket.
 *
 * @returns {import("@google-cloud/storage").Bucket}
 */
const getBucket = () => {
    if (!bucket) initializeStorage();
    return bucket;
};

/**
 * Get the raw GCS Storage client.
 *
 * @returns {Storage}
 */
const getStorage = () => {
    if (!storageClient) initializeStorage();
    return storageClient;
};

export { initializeStorage, getBucket, getStorage };
