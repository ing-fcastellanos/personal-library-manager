import { slugify, arraySlugs } from "../../lib/text/slug";
import { toIsbn13 } from "../enrichment/normalize";
import type { AICandidate, AIEngine, RawIdentification } from "./types";

/**
 * AI output normalization (#19, design D3/D6). Maps an engine's raw
 * identification into the shared `Candidate` shape (with `source: "ai"`),
 * computing the derived slug keys with the same deterministic helpers as
 * enrichment, canonicalizing the ISBN, and clamping the engine's confidence into
 * a comparable 0–1 range. Pure and unit-tested in the emulator-free lane.
 */

/** Neutral confidence assigned when an engine reports none (design D6). */
export const NEUTRAL_CONFIDENCE = 0.5;

/**
 * Maps an engine-reported confidence to 0–1. Accepts values already in 0–1, maps
 * a 0–100 percentage down, and clamps anything out of range. Missing/non-finite
 * input yields the neutral default so downstream ranking stays comparable.
 */
export function clampConfidence(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return NEUTRAL_CONFIDENCE;
  const scaled = value > 1 ? value / 100 : value;
  if (scaled < 0) return 0;
  if (scaled > 1) return 1;
  return scaled;
}

/**
 * Normalizes a raw identification into an `AICandidate`. `coverWidth` is null
 * (AI provides no cover) and `coverUrl` is null — downstream flows resolve the
 * cover via enrichment. `source` is always `"ai"`; `sourceProvider` records the
 * engine.
 */
export function toAICandidate(
  raw: RawIdentification,
  provider: AIEngine,
): AICandidate {
  const authors = (raw.authors ?? []).filter((a) => a.trim().length > 0);
  const categories = (raw.categories ?? []).filter((c) => c.trim().length > 0);

  return {
    title: raw.title,
    subtitle: raw.subtitle ?? null,
    authors,
    authorKeys: arraySlugs(authors),
    publisher: raw.publisher ?? null,
    publishedYear: raw.publishedYear ?? null,
    isbn13: toIsbn13(raw.isbn13 ?? raw.isbn10 ?? null),
    isbn10: raw.isbn10 ?? null,
    categories,
    categoryKeys: arraySlugs(categories),
    coverUrl: null,
    coverWidth: null,
    pageCount: null,
    language: raw.language ?? null,
    description: raw.description ?? null,
    titleKey: slugify(raw.title),
    source: "ai",
    confidence: clampConfidence(raw.confidence),
    sourceProvider: provider,
  };
}
