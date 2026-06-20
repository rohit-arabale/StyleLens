/**
 * Generation Service — invoke AI models for virtual try-on image generation.
 *
 * Strategy:
 * 1. Try primary model (Gemini 2.5 Flash Image)
 * 2. On failure/rate limit/unavailability → fallback to OSS (OOTDiffusion)
 *
 * Feature-flagged model selection for future extensibility.
 */
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES, HTTP_STATUS, MODELS } from "../constant.js";
import { logger } from "../utils/logger.js";

/**
 * Invoke the AI model to generate a try-on image.
 *
 * @param {object} params
 * @param {string} params.systemPrompt - System prompt
 * @param {string} params.userPrompt - User prompt with garment + person descriptions
 * @param {Buffer} params.personImage - Selfie image buffer
 * @param {Buffer} params.garmentImage - Garment image buffer
 * @param {object} params.garmentDesc - Parsed garment attributes
 * @param {string} [params.modelHint] - Preferred model to use
 * @returns {Promise<{ imageBytes: Buffer, modelUsed: string, processingMs: number }>}
 */
const invoke = async ({
    systemPrompt,
    userPrompt,
    personImage,
    garmentImage,
    garmentDesc,
    modelHint,
}) => {
    const startTime = Date.now();
    let modelUsed = modelHint || MODELS.PRIMARY;

    try {
        logger.info("Generation: Invoking model", { model: modelUsed });

        // TODO: Integrate with Gemini 2.5 Flash Image API
        // const response = await geminiClient.generate({
        //   systemPrompt,
        //   userPrompt,
        //   images: [personImage, garmentImage],
        // });

        // Placeholder: In production, this returns the generated image bytes
        const imageBytes = Buffer.from("generated-image-placeholder");

        const processingMs = Date.now() - startTime;

        logger.info("Generation: Completed", {
            model: modelUsed,
            processingMs,
        });

        return {
            imageBytes,
            modelUsed,
            processingMs,
        };
    } catch (primaryError) {
        logger.warn("Generation: Primary model failed, attempting fallback", {
            model: modelUsed,
            error: primaryError.message,
        });

        // Attempt fallback model
        try {
            modelUsed = MODELS.FALLBACK;

            // TODO: Integrate with OOTDiffusion or other OSS fallback
            const imageBytes = Buffer.from("fallback-generated-image-placeholder");

            const processingMs = Date.now() - startTime;

            logger.info("Generation: Fallback completed", {
                model: modelUsed,
                processingMs,
            });

            return {
                imageBytes,
                modelUsed,
                processingMs,
            };
        } catch (fallbackError) {
            logger.error("Generation: Both models failed", {
                primary: primaryError.message,
                fallback: fallbackError.message,
            });

            throw new ApiError(
                HTTP_STATUS.SERVICE_UNAVAILABLE,
                ERROR_CODES.MODEL_UNAVAILABLE,
                "All generation models are currently unavailable. Please try again later."
            );
        }
    }
};

export const generationService = { invoke };
