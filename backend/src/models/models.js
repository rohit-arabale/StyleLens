/**
 * Firestore Data Models & Converters.
 *
 * Defines the logical schema for Firestore collections:
 * - users/{userId}
 * - generations/{jobId}
 * - history/{userId}/items/{jobId}
 *
 * These functions create clean documents from raw input
 * and convert Firestore snapshots back to clean DTOs.
 */
import admin from "firebase-admin";

const FieldValue = admin.firestore.FieldValue;

// ─── User Model ─────────────────────────────────────────────────

/**
 * Create a new user document shape.
 *
 * @param {object} data
 * @param {string} data.userId
 * @param {string} [data.email]
 * @param {string} [data.selfieUrl]
 * @param {string} [data.selfieHash]
 * @returns {object} Firestore document data
 */
export const createUserDoc = ({ userId, email, selfieUrl, selfieHash }) => ({
    userId,
    email: email || null,
    selfieUrl: selfieUrl || null,
    selfieHash: selfieHash || null,
    attrs: {
        heightCm: null,
        weightKg: null,
        bodyType: null,
    },
    settings: {
        cacheReuse: true,
        marketingOptIn: false,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
});

/**
 * Convert a Firestore user snapshot to a clean DTO.
 *
 * @param {FirebaseFirestore.DocumentSnapshot} doc
 * @returns {object}
 */
export const userToDTO = (doc) => {
    if (!doc.exists) return null;
    const data = doc.data();
    return {
        userId: doc.id,
        email: data.email,
        selfieUrl: data.selfieUrl,
        selfieHash: data.selfieHash,
        attrs: data.attrs,
        settings: data.settings,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
};

// ─── Generation Model ───────────────────────────────────────────

/**
 * Create a new generation document shape.
 *
 * @param {object} data
 * @returns {object} Firestore document data
 */
export const createGenerationDoc = ({
    jobId,
    userId,
    previewUrl,
    fullUrl,
    thumbUrl,
    garmentUrl,
    garmentHash,
    selfieHash,
    occlusionScore,
    viewAngle,
    processingMs,
    modelUsed,
    promptVersion,
    status,
}) => ({
    jobId,
    userId,
    previewUrl: previewUrl || null,
    fullUrl: fullUrl || null,
    thumbUrl: thumbUrl || null,
    garmentUrl: garmentUrl || null,
    garmentHash: garmentHash || null,
    selfieHash: selfieHash || null,
    occlusionScore: occlusionScore || null,
    viewAngle: viewAngle || null,
    processingMs: processingMs || null,
    modelUsed: modelUsed || null,
    promptVersion: promptVersion || null,
    status: status || "completed",
    createdAt: FieldValue.serverTimestamp(),
});

/**
 * Convert a Firestore generation snapshot to a clean DTO.
 *
 * @param {FirebaseFirestore.DocumentSnapshot} doc
 * @returns {object}
 */
export const generationToDTO = (doc) => {
    if (!doc.exists) return null;
    const data = doc.data();
    return {
        jobId: doc.id,
        userId: data.userId,
        previewUrl: data.previewUrl,
        fullUrl: data.fullUrl,
        thumbUrl: data.thumbUrl,
        garmentUrl: data.garmentUrl,
        occlusionScore: data.occlusionScore,
        viewAngle: data.viewAngle,
        processingMs: data.processingMs,
        modelUsed: data.modelUsed,
        promptVersion: data.promptVersion,
        status: data.status,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
    };
};

// ─── History Item Model ─────────────────────────────────────────

/**
 * Create a new history item document shape.
 *
 * @param {object} data
 * @returns {object} Firestore document data
 */
export const createHistoryItemDoc = ({
    jobId,
    generationRef,
    source,
    servedFromCache,
}) => ({
    jobId,
    generationRef: generationRef || null,
    source: source || "web",
    rating: null,
    servedFromCache: servedFromCache || false,
    createdAt: FieldValue.serverTimestamp(),
    deletedAt: null,
});

/**
 * Convert a Firestore history item snapshot to a clean DTO.
 *
 * @param {FirebaseFirestore.DocumentSnapshot} doc
 * @returns {object}
 */
export const historyItemToDTO = (doc) => {
    if (!doc.exists) return null;
    const data = doc.data();
    return {
        jobId: doc.id,
        generationRef: data.generationRef,
        source: data.source,
        rating: data.rating,
        servedFromCache: data.servedFromCache,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        deletedAt: data.deletedAt?.toDate?.() || data.deletedAt,
    };
};
