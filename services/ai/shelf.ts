/**
 * Shelf batch classification (#21a, design D3). A pure rule that sorts each
 * AI-identified shelf book into an `auto` bucket (safe to add without review) or a
 * `review` bucket (needs a human), with the reason it needs review. No I/O — the
 * client gathers the inputs (AI confidence, whether enrichment matched, whether it
 * is a duplicate) and calls this, so the rule is unit-testable on its own.
 */

/** Default high-confidence threshold for the `auto` bucket; tunable in 21b QA. */
export const HIGH_CONFIDENCE = 0.8;

export type ReviewReason = "ok" | "low_confidence" | "no_match" | "duplicate";

export interface ClassifyInput {
  /** AI guess confidence (0–1), or null when none was produced. */
  aiConfidence: number | null;
  /** Whether enrichment resolved a canonical candidate for the book. */
  enriched: boolean;
  /**
   * Whether the enrichment match corroborates the AI-read title (an ISBN match,
   * or sufficient title agreement). Defaults to `true`; pass `false` to keep an
   * enriched-but-unconfirmed match out of the `auto` bucket.
   */
  confirmed?: boolean;
  /** Whether the book matches one already in the library. */
  duplicate: boolean;
}

export interface Classification {
  bucket: "auto" | "review";
  reason: ReviewReason;
}

/**
 * Auto only when AI-confident AND enrichment-matched AND that match corroborates
 * the read AND not a duplicate; every other book goes to review, carrying the
 * first failing reason (low confidence → no match → unconfirmed → duplicate). An
 * unconfirmed match is reviewed before the duplicate check because the duplicate
 * was detected against that (possibly wrong) candidate, so it is unreliable.
 */
export function classifyShelfBook(
  { aiConfidence, enriched, confirmed = true, duplicate }: ClassifyInput,
  threshold: number = HIGH_CONFIDENCE,
): Classification {
  if (aiConfidence == null || aiConfidence < threshold) {
    return { bucket: "review", reason: "low_confidence" };
  }
  if (!enriched) {
    return { bucket: "review", reason: "no_match" };
  }
  if (!confirmed) {
    return { bucket: "review", reason: "low_confidence" };
  }
  if (duplicate) {
    return { bucket: "review", reason: "duplicate" };
  }
  return { bucket: "auto", reason: "ok" };
}
