import type { Candidate } from "../enrichment/types";

/**
 * AI vision layer types (#19, design D1/D3). The layer identifies books from
 * photos and normalizes each engine's output to the shared enrichment
 * `Candidate` shape, extended with a `confidence` score and the `sourceProvider`
 * that produced it, so AI identifications flow into the existing intake path
 * (`toBookCreateInput`) without a translation layer.
 */

/** The interchangeable AI engines (design D2). OpenAI is the default. */
export type AIEngine = "openai" | "gemini";

/**
 * An image handed to an engine for identification. `base64` is the raw image
 * bytes base64-encoded (no data-URL prefix); `mimeType` is e.g. `image/jpeg`.
 */
export interface AIImage {
  base64: string;
  mimeType: string;
}

/**
 * A normalized AI identification. It is a `Candidate` (so it passes through
 * `toBookCreateInput`) with `source: "ai"`, plus:
 * - `confidence` — 0–1, mapped/clamped consistently across engines (design D6);
 * - `sourceProvider` — which engine produced it (design D3).
 */
export interface AICandidate extends Candidate {
  source: "ai";
  confidence: number;
  sourceProvider: AIEngine;
}

/**
 * The vendor-agnostic contract every engine implements (#19 D1). Callers depend
 * only on this interface, never on a concrete vendor. `isConfigured()` lets the
 * orchestrator skip an engine whose API key is absent without throwing (design
 * D5), so a missing key becomes a fallback trigger rather than a crash.
 */
export interface AIProvider {
  readonly id: AIEngine;
  /** True when the engine's API key is present server-side. */
  isConfigured(): boolean;
  /** Identify a single book from a cover/spine image; `null` when none recognized. */
  identifyBookFromImage(image: AIImage): Promise<AICandidate | null>;
  /** Identify multiple books from one shelf photo; `[]` when none recognized. */
  identifyBooksFromImage(image: AIImage): Promise<AICandidate[]>;
}

/**
 * Raw, pre-normalization identification an engine extracts from an image. The
 * engine modules produce this; `normalize.ts` turns it into an `AICandidate`
 * (computing slug keys, canonicalizing the ISBN, clamping confidence).
 */
export interface RawIdentification {
  title: string;
  subtitle?: string | null;
  authors?: string[];
  isbn13?: string | null;
  isbn10?: string | null;
  publisher?: string | null;
  publishedYear?: number | null;
  categories?: string[];
  language?: string | null;
  description?: string | null;
  /** Engine-reported confidence; may be absent or outside 0–1 (normalized later). */
  confidence?: number | null;
}

/** Thrown when no engine can answer (default and secondary both unavailable). */
export class NoEngineAvailableError extends Error {
  constructor(message = "No AI engine available to answer the request") {
    super(message);
    this.name = "NoEngineAvailableError";
  }
}

/** Raised by an engine when its API key is absent (design D5). */
export class EngineNotConfiguredError extends Error {
  constructor(public readonly engine: AIEngine) {
    super(`AI engine "${engine}" is not configured (missing API key)`);
    this.name = "EngineNotConfiguredError";
  }
}
