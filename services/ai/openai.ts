import OpenAI from "openai";
import { toAICandidate } from "./normalize";
import {
  IDENTIFY_MULTI_INSTRUCTION,
  IDENTIFY_SINGLE_INSTRUCTION,
  parseIdentifications,
} from "./prompt";
import type { AICandidate, AIImage, AIProvider } from "./types";

/**
 * OpenAI vision engine (#19, default per design D2). Reads `OPENAI_API_KEY` from
 * the server environment (Secret Manager in prod, design D5); when absent the
 * engine reports `isConfigured() === false` so the orchestrator falls back
 * instead of crashing. Keys are never sent to the browser.
 */

const MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o";

function dataUrl(image: AIImage): string {
  return `data:${image.mimeType};base64,${image.base64}`;
}

export function createOpenAIProvider(): AIProvider {
  const apiKey = process.env.OPENAI_API_KEY ?? "";

  let client: OpenAI | null = null;
  const getClient = () => (client ??= new OpenAI({ apiKey }));

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
    id: "openai",
    isConfigured: () => apiKey.length > 0,

    async identifyBookFromImage(image: AIImage): Promise<AICandidate | null> {
      const text = await complete(IDENTIFY_SINGLE_INSTRUCTION, image);
      const [first] = parseIdentifications(text);
      return first ? toAICandidate(first, "openai") : null;
    },

    async identifyBooksFromImage(image: AIImage): Promise<AICandidate[]> {
      const text = await complete(IDENTIFY_MULTI_INSTRUCTION, image);
      return parseIdentifications(text).map((raw) =>
        toAICandidate(raw, "openai"),
      );
    },
  };
}
