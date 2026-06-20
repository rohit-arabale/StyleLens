/**
 * Database Service — Firestore operations for users, generations, and history.
 *
 * Handles all CRUD operations against Firestore collections.
 * Uses batched writes where appropriate for atomicity.
 */
import { getDb } from "../db/index.js";
import { COLLECTIONS } from "../constant.js";
import {
    createUserDoc,
    userToDTO,
    createGenerationDoc,
    generationToDTO,
    createHistoryItemDoc,
    historyItemToDTO,
} from "../models/models.js";
import { decodeCursor, encodeCursor } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

// ─── User Operations ────────────────────────────────────────────

/**
 * Get or create a user document.
 *
 * @param {string} userId
 * @param {string} [email]
 * @returns {Promise<object>} User DTO
 */
const getOrCreateUser = async (userId, email) => {
    const db = getDb();
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
        return userToDTO(userSnap);
    }

    // Create new user
    await userRef.set(createUserDoc({ userId, email }));
    const newSnap = await userRef.get();
    return userToDTO(newSnap);
};

/**
 * Get a user by ID.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
const getUser = async (userId) => {
    const db = getDb();
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    return userToDTO(userSnap);
};

/**
 * Update user's selfie URL and hash.
 *
 * @param {string} userId
 * @param {string} selfieUrl
 * @param {string} selfieHash
 * @returns {Promise<void>}
 */
const updateUserSelfie = async (userId, selfieUrl, selfieHash) => {
    const db = getDb();
    await db.collection(COLLECTIONS.USERS).doc(userId).update({
        selfieUrl,
        selfieHash,
        updatedAt: new Date(),
    });
};

// ─── Generation Operations ──────────────────────────────────────

/**
 * Write a generation record and its history pointer in a batched transaction.
 *
 * @param {object} generationData
 * @param {object} historyData
 * @returns {Promise<void>}
 */
const writeGeneration = async (generationData, historyData) => {
    const db = getDb();
    const batch = db.batch();

    // Write generation doc
    const genRef = db
        .collection(COLLECTIONS.GENERATIONS)
        .doc(generationData.jobId);
    batch.set(genRef, createGenerationDoc(generationData));

    // Write history item
    const historyRef = db
        .collection(COLLECTIONS.HISTORY)
        .doc(generationData.userId)
        .collection(COLLECTIONS.HISTORY_ITEMS)
        .doc(generationData.jobId);
    batch.set(
        historyRef,
        createHistoryItemDoc({
            jobId: generationData.jobId,
            generationRef: genRef.path,
            source: historyData.source,
            servedFromCache: historyData.servedFromCache || false,
        })
    );

    await batch.commit();

    logger.info("DB: Generation + history written", {
        jobId: generationData.jobId,
        userId: generationData.userId,
    });
};

/**
 * Get a generation by jobId.
 *
 * @param {string} jobId
 * @returns {Promise<object|null>}
 */
const getGeneration = async (jobId) => {
    const db = getDb();
    const genSnap = await db.collection(COLLECTIONS.GENERATIONS).doc(jobId).get();
    return generationToDTO(genSnap);
};

// ─── History Operations ─────────────────────────────────────────

/**
 * List history items for a user with cursor-based pagination.
 *
 * @param {string} userId
 * @param {object} options
 * @param {number} options.limit
 * @param {string} [options.cursor]
 * @param {string} [options.category]
 * @param {string} [options.source]
 * @param {string} [options.from]
 * @param {string} [options.to]
 * @returns {Promise<{ items: object[], nextCursor: string|null }>}
 */
const listHistory = async (userId, { limit, cursor, category, source, from, to }) => {
    const db = getDb();

    let query = db
        .collection(COLLECTIONS.HISTORY)
        .doc(userId)
        .collection(COLLECTIONS.HISTORY_ITEMS)
        .where("deletedAt", "==", null)
        .orderBy("createdAt", "desc")
        .limit(limit + 1); // +1 to check for next page

    // Apply cursor
    if (cursor) {
        const decoded = decodeCursor(cursor);
        if (decoded) {
            query = query.startAfter(new Date(decoded.createdAt));
        }
    }

    // Apply filters
    if (source) {
        query = query.where("source", "==", source);
    }

    const snapshot = await query.get();
    const items = [];

    for (const doc of snapshot.docs.slice(0, limit)) {
        const historyItem = historyItemToDTO(doc);

        // Optionally enrich with generation data
        if (historyItem?.generationRef) {
            const genSnap = await db.doc(historyItem.generationRef).get();
            const generation = generationToDTO(genSnap);
            if (generation) {
                historyItem.generation = generation;
            }
        }

        items.push(historyItem);
    }

    // Determine next cursor
    const hasMore = snapshot.docs.length > limit;
    const nextCursor = hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1])
        : null;

    return { items, nextCursor };
};

/**
 * Soft-delete a history item.
 *
 * @param {string} userId
 * @param {string} jobId
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deleteHistoryItem = async (userId, jobId) => {
    const db = getDb();
    const historyRef = db
        .collection(COLLECTIONS.HISTORY)
        .doc(userId)
        .collection(COLLECTIONS.HISTORY_ITEMS)
        .doc(jobId);

    const snap = await historyRef.get();
    if (!snap.exists) return false;

    await historyRef.update({
        deletedAt: new Date(),
    });

    logger.info("DB: History item soft-deleted", { userId, jobId });
    return true;
};

// ─── Account Operations ─────────────────────────────────────────

/**
 * Cascade delete all user data from Firestore.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
const cascadeDeleteUser = async (userId) => {
    const db = getDb();

    // Delete history subcollection
    const historySnapshot = await db
        .collection(COLLECTIONS.HISTORY)
        .doc(userId)
        .collection(COLLECTIONS.HISTORY_ITEMS)
        .get();

    const batch = db.batch();
    historySnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete history parent doc
    batch.delete(db.collection(COLLECTIONS.HISTORY).doc(userId));

    // Delete user doc
    batch.delete(db.collection(COLLECTIONS.USERS).doc(userId));

    await batch.commit();

    // Delete generations (separate query — could be large)
    const genSnapshot = await db
        .collection(COLLECTIONS.GENERATIONS)
        .where("userId", "==", userId)
        .get();

    if (!genSnapshot.empty) {
        const genBatch = db.batch();
        genSnapshot.docs.forEach((doc) => genBatch.delete(doc.ref));
        await genBatch.commit();
    }

    logger.info("DB: User data cascade deleted", { userId });
};

export const dbService = {
    getOrCreateUser,
    getUser,
    updateUserSelfie,
    writeGeneration,
    getGeneration,
    listHistory,
    deleteHistoryItem,
    cascadeDeleteUser,
};
