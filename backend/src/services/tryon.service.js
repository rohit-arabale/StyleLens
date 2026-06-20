/**
 * Try-On Service — orchestrates the complete virtual try-on pipeline.
 *
 * Full flow:
 *   hash inputs → check cache → load selfie → vision.garmentParse →
 *   vision.personParse → promptBuilder.build → generation.invoke(model) →
 *   storage.save(full+thumb) → db.writeGeneration + history →
 *   telemetry emit → return response DTO
 */
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES, HTTP_STATUS } from "../constant.js";
import { generateHash, generateJobId, parseDataUri, getExpiresAt } from "../utils/helpers.js";
import { promptBuilder } from "../utils/promptBuilder.js";
import { visionService } from "./vision.service.js";
import { generationService } from "./generation.service.js";
import { storageService } from "./storage.service.js";
import { dbService } from "./db.service.js";
import { cacheService } from "./cache.service.js";
import { logger } from "../utils/logger.js";

/**
 * Process a complete try-on request.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user's ID
 * @param {string} [params.garmentImage] - Base64/data URI of garment
 * @param {string} [params.garmentUrl] - URL to garment image
 * @param {object} [params.options] - preservePose, lightingMatch
 * @param {string} [params.idempotencyKey] - Optional dedup key
 * @param {string} [params.source] - "extension" | "web"
 * @returns {Promise<object>} { jobId, status, previewUrl, expiresAt, metadata }
 */
const processTryon = async ({
    userId,
    garmentImage,
    garmentUrl,
    options = {},
    idempotencyKey,
    source = "web",
}) => {
    const startTime = Date.now();
    const jobId = generateJobId();

    logger.info("TryOn: Starting", { jobId, userId, source });

    try {
        // 1. Resolve garment image bytes
        let garmentBytes;
        if (garmentImage) {
            const parsed = parseDataUri(garmentImage);
            if (parsed) {
                garmentBytes = parsed.buffer;
            } else {
                // Assume raw base64
                garmentBytes = Buffer.from(garmentImage, "base64");
            }
        } else if (garmentUrl) {
            // TODO: Fetch from URL
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.INVALID_IMAGE,
                "URL-based garment input is not yet supported. Please provide base64."
            );
        }

        if (!garmentBytes || garmentBytes.length === 0) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.INVALID_IMAGE,
                "Garment image could not be resolved."
            );
        }

        // 2. Load user selfie
        const user = await dbService.getUser(userId);
        if (!user || !user.selfieUrl) {
            throw new ApiError(
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.SELFIE_REQUIRED,
                "Please upload a selfie before generating a try-on."
            );
        }

        // 3. Hash inputs for caching
        const garmentHash = generateHash(garmentBytes);
        const selfieHash = user.selfieHash;

        // 4. Check cache
        const cacheKey = cacheService.buildCacheKey({
            garmentHash,
            selfieHash,
            modelUsed: "primary",
            promptVersion: promptBuilder.PROMPT_VERSION,
        });

        const cached = cacheService.lookup(cacheKey);
        if (cached) {
            logger.info("TryOn: Served from cache", { jobId, userId });

            // Still write history for cached result
            await dbService.writeGeneration(
                { ...cached.generationData, jobId },
                { source, servedFromCache: true }
            );

            return {
                jobId,
                status: "cached",
                previewUrl: cached.previewUrl,
                expiresAt: getExpiresAt(),
                metadata: { ...cached.metadata, servedFromCache: true },
            };
        }

        // 5. Vision parsing (parallel)
        const [garmentDesc, personDesc] = await Promise.all([
            visionService.garmentParse(garmentBytes),
            visionService.personParse(garmentBytes), // Placeholder: should use selfie bytes
        ]);

        // 6. Build prompt
        const { systemPrompt, userPrompt, promptVersion } = promptBuilder.build(
            garmentDesc,
            personDesc
        );

        // 7. Generate image
        const { imageBytes, modelUsed, processingMs } = await generationService.invoke({
            systemPrompt,
            userPrompt,
            personImage: garmentBytes, // Placeholder: should use selfie bytes from storage
            garmentImage: garmentBytes,
            garmentDesc,
        });

        // 8. Save to storage
        const { fullUrl, thumbUrl, previewUrl } = await storageService.saveGeneration({
            userId,
            jobId,
            imageBytes,
        });

        // 9. Write to database
        const generationData = {
            jobId,
            userId,
            previewUrl,
            fullUrl,
            thumbUrl,
            garmentUrl: garmentUrl || null,
            garmentHash,
            selfieHash,
            occlusionScore: garmentDesc.occlusionScore,
            viewAngle: garmentDesc.viewAngle,
            processingMs,
            modelUsed,
            promptVersion,
            status: "completed",
        };

        await dbService.writeGeneration(generationData, {
            source,
            servedFromCache: false,
        });

        // 10. Cache the result
        const cacheValue = {
            generationData,
            previewUrl,
            metadata: {
                modelUsed,
                processingMs,
                promptVersion,
                garmentHash,
            },
        };
        cacheService.store(cacheKey, cacheValue);

        // 11. Build response
        const totalMs = Date.now() - startTime;
        logger.info("TryOn: Completed", { jobId, userId, totalMs });

        return {
            jobId,
            status: "completed",
            previewUrl,
            expiresAt: getExpiresAt(),
            metadata: {
                modelUsed,
                processingMs,
                promptVersion,
                garmentHash,
                totalMs,
            },
        };
    } catch (error) {
        logger.error("TryOn: Failed", {
            jobId,
            userId,
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
};

export const tryonService = { processTryon };
