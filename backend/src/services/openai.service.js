import OpenAI from "openai";
import config from "../config/config.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey || "dummy-key",
});

/**
 * Call OpenAI Chat Completion with JSON mode enabled.
 *
 * @param {string} systemPrompt - System prompt instructions
 * @param {string} userPrompt - User prompt containing content
 * @param {object} [options] - Additional options (model, temperature)
 * @returns {Promise<object>} Parsed JSON response object
 */
export async function generateJSONCompletion(systemPrompt, userPrompt, options = {}) {
  if (!config.openai.apiKey) {
    throw new AppError(
      "OPENAI_API_KEY is not configured in environment variables.",
      500,
      "OPENAI_SERVICE"
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: options.model || config.openai.model,
      temperature: options.temperature ?? 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty completion response.");
    }

    return JSON.parse(content);
  } catch (error) {
    logger.error(`OpenAI JSON Completion failed: ${error.message}`);
    throw error;
  }
}

/**
 * Call OpenAI Chat Completion returning plain text (e.g., for cover letters).
 *
 * @param {string} systemPrompt - System prompt instructions
 * @param {string} userPrompt - User prompt
 * @param {object} [options] - Additional options (model, temperature)
 * @returns {Promise<string>} Clean text response
 */
export async function generateTextCompletion(systemPrompt, userPrompt, options = {}) {
  if (!config.openai.apiKey) {
    throw new AppError(
      "OPENAI_API_KEY is not configured in environment variables.",
      500,
      "OPENAI_SERVICE"
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: options.model || config.openai.model,
      temperature: options.temperature ?? 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty completion response.");
    }

    return content.trim();
  } catch (error) {
    logger.error(`OpenAI Text Completion failed: ${error.message}`);
    throw error;
  }
}

/**
 * Call OpenAI Multimodal Vision Chat Completion with JSON mode enabled to analyze screenshots.
 *
 * @param {string} systemPrompt - System prompt instructions
 * @param {string} userTextPrompt - User text prompt
 * @param {string} base64Data - Base64 image data (with or without data URL prefix)
 * @param {string} [mimeType="image/png"] - Image mime type
 * @param {object} [options] - Additional options
 * @returns {Promise<object>} Parsed JSON response object
 */
export async function generateVisionJSONCompletion(
  systemPrompt,
  userTextPrompt,
  base64Data,
  mimeType = "image/png",
  options = {}
) {
  if (!config.openai.apiKey) {
    throw new AppError(
      "OPENAI_API_KEY is not configured in environment variables.",
      500,
      "OPENAI_SERVICE"
    );
  }

  // Format data URL
  const imageUrl = base64Data.startsWith("data:")
    ? base64Data
    : `data:${mimeType};base64,${base64Data}`;

  try {
    const response = await openai.chat.completions.create({
      model: options.model || config.openai.model,
      temperature: options.temperature ?? 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userTextPrompt },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty vision completion response.");
    }

    return JSON.parse(content);
  } catch (error) {
    logger.error(`OpenAI Vision JSON Completion failed: ${error.message}`);
    throw error;
  }
}

export default {
  generateJSONCompletion,
  generateTextCompletion,
  generateVisionJSONCompletion,
};
