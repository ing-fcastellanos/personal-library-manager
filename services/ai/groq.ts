import OpenAI from "openai";
import { toAICandidate } from "./normalize";
import {
  IDENTIFY_MULTI_INSTRUCTION,
  IDENTIFY_SINGLE_INSTRUCTION,
  parseIdentifications,
} from "./prompt";
import type { AICandidate, AIImage, AIProvider } from "./types";

/**
 * Groq vision engine (#19, free-tier fallback added when OpenAI went unfunded).
 * Reads `GROQ_API_KEY` from the server environment (Secret Manager in prod,
 * design D5); when absent the engine reports `isConfigured() === false` so the
 * orchestrator skips it. Groq's API is OpenAI-compatible, so this mirrors
 * `openai.ts` with a different base URL and model. Keys are never sent to the
 * browser.
 */

const MODEL = process.env.GROQ_VISION_MODEL ?? "qwen/qwen3.6-27b";
/** Groq's OpenAI-compatible endpoint; also used by the settings probe. */
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function dataUrl(image: AIImage): string {
  return `data:${image.mimeType};base64,${image.base64}`;
}

export function createGroqProvider(): AIProvider {
  const apiKey = process.env.GROQ_API_KEY ?? "";

  let client: OpenAI | null = null;
  const getClient = () =>
    (client ??= new OpenAI({ apiKey, baseURL: GROQ_BASE_URL }));

  async function complete(
    instruction: string,
    image: AIImage,
  ): Promise<string> {
    const res = await getClient().chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: dataUrl(image) } },
          ],
        },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  return {
    id: "groq",
    isConfigured: () => apiKey.length > 0,

    async identifyBookFromImage(image: AIImage): Promise<AICandidate | null> {
      const text = await complete(IDENTIFY_SINGLE_INSTRUCTION, image);
      const [first] = parseIdentifications(text);
      return first ? toAICandidate(first, "groq") : null;
    },

    async identifyBooksFromImage(image: AIImage): Promise<AICandidate[]> {
      const text = await complete(IDENTIFY_MULTI_INSTRUCTION, image);
      return parseIdentifications(text).map((raw) =>
        toAICandidate(raw, "groq"),
      );
    },
  };
}
