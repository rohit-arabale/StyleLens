/**
 * Account Service — handles account lifecycle operations.
 *
 * Cascade deletion: Firestore docs, GCS objects (selfies, generations),
 * signed URL revocation.
 */
import { dbService } from "./db.service.js";
import { storageService } from "./storage.service.js";
import { logger } from "../utils/logger.js";

/**
 * Cascade delete a user account.
 * Deletes all associated data from Firestore and GCS.
 * Operations are idempotent — safe to retry.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
const cascadeDelete = async (userId) => {
    logger.info("Account: Starting cascade deletion", { userId });

    try {
        // 1. Delete GCS files (selfies, generations)
        await storageService.deleteUserFiles(userId);

        // 2. Delete Firestore documents (user, history, generations)
        await dbService.cascadeDeleteUser(userId);

        logger.info("Account: Cascade deletion completed", { userId });
    } catch (error) {
        logger.error("Account: Cascade deletion failed", {
            userId,
            error: error.message,
        });
        throw error;
    }
};

export const accountService = { cascadeDelete };
