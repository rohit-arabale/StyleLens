/**
 * Zod validation schemas for all API endpoints.
 * Defines the expected shape and constraints of request payloads.
 */
import { z } from "zod";
import { LIMITS, SOURCE_TYPES } from "../constant.js";

// ─── Try-On Schemas ─────────────────────────────────────────────

export const tryonSchema = z.object({
    garmentImage: z
        .string()
        .min(1, "Garment image is required (base64 or data URI)")
        .optional(),
    garmentUrl: z.string().url("Must be a valid URL").optional(),
    options: z
        .object({
            preservePose: z.boolean().default(true),
            lightingMatch: z.boolean().default(true),
        })
        .optional()
        .default({}),
    client: z
        .object({
            source: z.enum([SOURCE_TYPES.EXTENSION, SOURCE_TYPES.WEB]).default(SOURCE_TYPES.WEB),
            version: z.string().optional(),
        })
        .optional()
        .default({ source: SOURCE_TYPES.WEB }),
    idempotencyKey: z.string().uuid().optional(),
}).refine(
    (data) => data.garmentImage || data.garmentUrl,
    { message: "Either garmentImage or garmentUrl must be provided" }
);

// ─── History Schemas ────────────────────────────────────────────

export const historyQuerySchema = z.object({
    limit: z
        .string()
        .optional()
        .transform((val) => {
            const num = parseInt(val || String(LIMITS.DEFAULT_HISTORY_LIMIT), 10);
            return Math.min(Math.max(num, 1), LIMITS.MAX_HISTORY_LIMIT);
        }),
    cursor: z.string().optional(),
    category: z.string().optional(),
    source: z.enum([SOURCE_TYPES.EXTENSION, SOURCE_TYPES.WEB]).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
});

export const deleteHistorySchema = z.object({
    jobId: z.string().min(1, "Job ID is required"),
});

// ─── Selfie Schemas ─────────────────────────────────────────────

export const selfieUploadSchema = z.object({
    selfieImage: z
        .string()
        .min(1, "Selfie image is required (base64 or data URI)")
        .optional(),
});

// ─── Account Schemas ────────────────────────────────────────────

export const accountDeleteSchema = z.object({
    confirmation: z
        .literal("DELETE_MY_ACCOUNT")
        .optional(),
});
