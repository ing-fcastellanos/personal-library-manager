import { GoogleGenAI } from "@google/genai";
import { toAICandidate } from "./normalize";
import {
  IDENTIFY_MULTI_INSTRUCTION,
  IDENTIFY_SINGLE_INSTRUCTION,
  parseIdentifications,
} from "./prompt";
import type { AICandidate, AIImage, AIProvider } from "./types";

/**
 * Gemini vision engine (#19, secondary per design D2). Reads `GEMINI_API_KEY`
 * from the server environment (Secret Manager in prod, design D5); when absent
 * the engine reports `isConfigured() === false` so the orchestrator skips it.
 * Keys are never sent to the browser.
 */

const MODEL = process.env.GEMINI_VISION_MODEL ?? "gemini-2.0-flash";

export function createGeminiProvider(): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY ?? "";

  let client: GoogleGenAI | null = null;
  const getClient = () => (client ??= new GoogleGenAI({ apiKey }));

  async function complete(
    instruction: string,
    image: AIImage,
  ): Promise<string> {
    const res = await getClient().models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: instruction },
            { inlineData: { mimeType: image.mimeType, data: image.base64 } },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });
    return res.text ?? "";
  }

  return {
    id: "gemini",
    isConfigured: () => apiKey.length > 0,

    async identifyBookFromImage(image: AIImage): Promise<AICandidate | null> {
      const text = await complete(IDENTIFY_SINGLE_INSTRUCTION, image);
      const [first] = parseIdentifications(text);
      return first ? toAICandidate(first, "gemini") : null;
    },

    async identifyBooksFromImage(image: AIImage): Promise<AICandidate[]> {
      const text = await complete(IDENTIFY_MULTI_INSTRUCTION, image);
      return parseIdentifications(text).map((raw) =>
        toAICandidate(raw, "gemini"),
      );
    },
  };
}
