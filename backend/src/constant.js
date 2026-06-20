/**
 * Application-wide constants, enums, and configuration keys.
 * Single source of truth for error codes, bucket names, limits, and model IDs.
 */

// ─── Canonical Error Codes ──────────────────────────────────────
export const PROJECT_META = Object.freeze({
    NAME: "StyleLens",
    DEVELOPER: "Rohit Arabale",
    AUTHOR: "Rohit Arabale",
    CREDIT: "Developed by Rohit Arabale",
});

export const ERROR_CODES = Object.freeze({
    INVALID_IMAGE: "INVALID_IMAGE",
    UNSUPPORTED_TYPE: "UNSUPPORTED_TYPE",
    GARMENT_OCCLUDED: "GARMENT_OCCLUDED",
    SIDE_VIEW: "SIDE_VIEW",
    FACE_MISSING: "FACE_MISSING",
    NSFW_DETECTED: "NSFW_DETECTED",
    RATE_LIMIT: "RATE_LIMIT",
    MODEL_UNAVAILABLE: "MODEL_UNAVAILABLE",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    DUPLICATE_REQUEST: "DUPLICATE_REQUEST",
    SELFIE_REQUIRED: "SELFIE_REQUIRED",
});

// ─── HTTP Status Codes ──────────────────────────────────────────
export const HTTP_STATUS = Object.freeze({
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
});

// ─── Allowed Image Types ────────────────────────────────────────
export const IMAGE_TYPES = Object.freeze(["image/jpeg", "image/png"]);

// ─── Limits ─────────────────────────────────────────────────────
export const LIMITS = Object.freeze({
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5 MB
    MAX_HISTORY_LIMIT: 50,
    DEFAULT_HISTORY_LIMIT: 20,
    SELFIE_NORMALIZED_SIZE: 1024, // 1024x1024 px
    THUMB_SIZE: 512, // 512px thumbnails
    SIGNED_URL_TTL_MINUTES: 60, // 60 min default
    OCCLUSION_THRESHOLD: 0.35,
    MAX_VIEW_ANGLE: 30, // degrees
});

// ─── GCS Bucket Paths ───────────────────────────────────────────
export const BUCKET_PATHS = Object.freeze({
    SELFIES: "selfies",
    GENERATIONS_FULL: "generations/full",
    GENERATIONS_THUMBS: "generations/thumbs",
});

// ─── Firestore Collection Names ────────────────────────────────
export const COLLECTIONS = Object.freeze({
    USERS: "users",
    GENERATIONS: "generations",
    HISTORY: "history",
    HISTORY_ITEMS: "items",
});

// ─── AI Model IDs ───────────────────────────────────────────────
export const MODELS = Object.freeze({
    PRIMARY: "gemini-2.5-flash-image",
    FALLBACK: "ootdiffusion",
});

// ─── User Roles ─────────────────────────────────────────────────
export const ROLES = Object.freeze({
    USER: "user",
    ADMIN: "admin",
});

// ─── Generation Statuses ────────────────────────────────────────
export const GENERATION_STATUS = Object.freeze({
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
    CACHED: "cached",
});

// ─── Source Types ───────────────────────────────────────────────
export const SOURCE_TYPES = Object.freeze({
    EXTENSION: "extension",
    WEB: "web",
});

// ─── Rate Limit Config ─────────────────────────────────────────
export const RATE_LIMIT_CONFIG = Object.freeze({
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS_PER_IP: 100,
    MAX_TRYONS_PER_USER: 20, // per 15 min window
});
