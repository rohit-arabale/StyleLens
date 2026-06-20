/**
 * Account Routes
 * POST /api/v1/account/delete
 */
import { Router } from "express";
import { deleteAccount } from "../controllers/account.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { accountDeleteSchema } from "../models/schemas.js";

const router = Router();

router.post(
    "/delete",
    authMiddleware,
    validate(accountDeleteSchema, "body"),
    deleteAccount
);

export default router;
