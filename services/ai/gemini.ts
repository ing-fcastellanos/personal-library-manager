import { GoogleGenAI, ApiError } from "@google/genai";
import { toAICandidate } from "./normalize";
import {
  IDENTIFY_MULTI_INSTRUCTION,
  IDENTIFY_SINGLE_INSTRUCTION,
  parseIdentifications,
} from "./prompt";
import type { AICandidate, AIImage, AIProvider } from "./types";

/**
 * Gemini vision engine (#19, default since OpenAI went unfunded). Reads
 * `GEMINI_API_KEY` from the server environment (Secret Manager in prod, design
 * D5); when absent the engine reports `isConfigured() === false` so the
 * orchestrator skips it. Keys are never sent to the browser.
 *
 * With no secondary engine to fall back to (fallback is off by default), a
 * transient upstream hiccup — Gemini's free tier occasionally answers `503
 * UNAVAILABLE` under high demand, or `429 RESOURCE_EXHAUSTED` when a burst hits
 * the per-minute quota — would otherwise surface straight to the reader. Both
 * are retried in-place with backoff, mirroring the retry the enrichment layer
 * already does for Google Books' `429`.
 */

// gemini-2.0-flash was retired by Google, and its direct successor
// (gemini-2.5-flash) turned out to already be restricted for this project's
// key too — pinning to another dated snapshot would just repeat the same
// failure down the line. `gemini-flash-latest` is Google's own rolling alias
// for its current flash-tier model, verified reachable for this key directly
// against the API before adopting it here.
const MODEL = process.env.GEMINI_VISION_MODEL ?? "gemini-flash-latest";

/** Backoff delays (ms) between the 2 retries a transient failure gets. */
const TRANSIENT_RETRY_DELAYS_MS = [1000, 3000];

async function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True for the retryable statuses: rate-limited or transiently unavailable. */
function isTransient(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 429 || err.status === 503);
}

export interface GeminiProviderOptions {
  /** Backoff sleep, injectable so retry tests run without real waits. */
  delayImpl?: (ms: number) => Promise<void>;
}

export function createGeminiProvider(
  options: GeminiProviderOptions = {},
): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const delayImpl = options.delayImpl ?? defaultDelay;

  let client: GoogleGenAI | null = null;
  const getClient = () => (client ??= new GoogleGenAI({ apiKey }));

  async function generate(
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

  /**
   * Retries `generate` on a transient `ApiError`, up to
   * `TRANSIENT_RETRY_DELAYS_MS.length` extra attempts. Any other error (or a
   * non-transient status) propagates immediately.
   */
  async function complete(
    instruction: string,
    image: AIImage,
  ): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await generate(instruction, image);
      } catch (err) {
        if (!isTransient(err) || attempt >= TRANSIENT_RETRY_DELAYS_MS.length) {
          throw err;
        }
        await delayImpl(TRANSIENT_RETRY_DELAYS_MS[attempt]);
      }
    }
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
