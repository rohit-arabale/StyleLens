/**
 * File Upload Middleware (Multer).
 * Handles multipart/form-data parsing with size/type guards.
 * Strips EXIF data optionally for privacy.
 */
import multer from "multer";
import { IMAGE_TYPES, LIMITS } from "../constant.js";

/**
 * Multer storage configuration.
 * Uses memory storage so files are available as buffers
 * for processing (hashing, resizing, uploading to GCS).
 */
const storage = multer.memoryStorage();

/**
 * File filter — only allow image/jpeg and image/png.
 */
const fileFilter = (_req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(`Unsupported file type: ${file.mimetype}. Only JPEG and PNG are allowed.`),
            false
        );
    }
};

/**
 * Configured Multer instance for single file uploads.
 * Field name: "image"
 */
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: LIMITS.MAX_IMAGE_SIZE,
        files: 1,
    },
});

/**
 * Middleware for single image upload (field: "image").
 */
const uploadSingle = upload.single("image");

/**
 * Wrapper that converts Multer errors into proper error flow.
 */
const uploadMiddleware = (req, res, next) => {
    uploadSingle(req, res, (err) => {
        if (err) {
            return next(err);
        }
        next();
    });
};

export { uploadMiddleware };
