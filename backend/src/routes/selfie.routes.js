/**
 * Selfie Routes
 * POST /api/v1/selfie
 */
import { Router } from "express";
import { uploadSelfie } from "../controllers/selfie.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { uploadMiddleware } from "../middleware/upload.middleware.js";

const router = Router();

router.post(
    "/",
    authMiddleware,
    uploadMiddleware,
    uploadSelfie
);

export default router;
