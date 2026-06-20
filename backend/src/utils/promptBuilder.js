/**
 * Prompt Builder — constructs system and user prompts
 * for virtual try-on generation models.
 *
 * Prompt versioning is tracked so each generation records
 * which prompt version was used, enabling rollback.
 */

const PROMPT_VERSION = "1.0.0";

/**
 * Build the system prompt for the try-on generation model.
 *
 * @returns {string} System prompt
 */
const buildSystemPrompt = () => {
    return `You are a photorealistic virtual try-on model. Your task is to generate a natural-looking image of a person wearing a specified garment.

Guidelines:
- Preserve the person's exact facial features, skin tone, hair style, and body proportions.
- Accurately render the garment's color, pattern, texture, fit, and draping.
- Maintain consistent lighting between the person and garment.
- Ensure natural pose alignment — the garment should follow the person's body geometry.
- Do not alter the background; keep it clean and neutral.
- Output a single, photorealistic, high-quality image.`;
};

/**
 * Build the user prompt from parsed garment and person descriptions.
 *
 * @param {object} garmentDesc - Parsed garment attributes from vision service
 * @param {string} garmentDesc.category - e.g., "t-shirt", "jacket"
 * @param {string} garmentDesc.color - e.g., "navy blue"
 * @param {string} garmentDesc.pattern - e.g., "solid", "striped"
 * @param {string} garmentDesc.material - e.g., "cotton", "polyester"
 * @param {object} personDesc - Parsed person attributes from vision service
 * @param {string} personDesc.skinTone - e.g., "medium"
 * @param {string} personDesc.bodyType - e.g., "athletic"
 * @param {string} personDesc.pose - e.g., "standing front"
 * @param {string} personDesc.lighting - e.g., "soft natural"
 * @returns {{ systemPrompt: string, userPrompt: string, promptVersion: string }}
 */
const build = (garmentDesc = {}, personDesc = {}) => {
    const garmentParts = [
        garmentDesc.category && `Category: ${garmentDesc.category}`,
        garmentDesc.color && `Color: ${garmentDesc.color}`,
        garmentDesc.pattern && `Pattern: ${garmentDesc.pattern}`,
        garmentDesc.material && `Material: ${garmentDesc.material}`,
        garmentDesc.fit && `Fit: ${garmentDesc.fit}`,
    ]
        .filter(Boolean)
        .join("\n");

    const personParts = [
        personDesc.skinTone && `Skin Tone: ${personDesc.skinTone}`,
        personDesc.bodyType && `Body Type: ${personDesc.bodyType}`,
        personDesc.pose && `Pose: ${personDesc.pose}`,
        personDesc.lighting && `Lighting: ${personDesc.lighting}`,
        personDesc.hairStyle && `Hair Style: ${personDesc.hairStyle}`,
        personDesc.accessories && `Accessories: ${personDesc.accessories}`,
    ]
        .filter(Boolean)
        .join("\n");

    const userPrompt = `Generate a photorealistic try-on image with the following specifications:

GARMENT:
${garmentParts || "No specific garment details provided."}

PERSON:
${personParts || "No specific person details provided."}

Ensure the garment fits naturally on the person, maintaining accurate proportions and consistent lighting.`;

    return {
        systemPrompt: buildSystemPrompt(),
        userPrompt,
        promptVersion: PROMPT_VERSION,
    };
};

export const promptBuilder = { build, PROMPT_VERSION };
