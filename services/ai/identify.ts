import { identifyBookFromImage } from "./service";
import { enrichByIsbn, searchByText } from "../enrichment/service";
import type { AICandidate, AIEngine, AIImage } from "./types";
import type { Candidate } from "../enrichment/types";

/**
 * Photo book identification (#20, design D2). Bridges the AI vision layer (#19)
 * to metadata enrichment (#13): identify the book in a photo, then resolve it to
 * canonical candidates server-side — by ISBN when the AI read one, otherwise by
 * text search over the recognized title/authors. Returns a `best` match plus
 * ranked `alternatives`, degrading to the raw AI candidate when enrichment finds
 * nothing so the reader can still edit and save. Dependencies are injectable for
 * network-free tests.
 */

export interface IdentifyResult {
  /** AI guess confidence (0–1), or null when nothing was recognized. */
  aiConfidence: number | null;
  /** Engine that produced the guess, or null when nothing was recognized. */
  sourceProvider: AIEngine | null;
  /** Top enriched candidate (or the raw AI candidate when no match), else null. */
  best: Candidate | null;
  /** Other ranked enrichment matches (empty for the ISBN / no-match paths). */
  alternatives: Candidate[];
}

export interface IdentifyDeps {
  identify?: typeof identifyBookFromImage;
  byIsbn?: typeof enrichByIsbn;
  byText?: typeof searchByText;
}

const EMPTY: IdentifyResult = {
  aiConfidence: null,
  sourceProvider: null,
  best: null,
  alternatives: [],
};

/** Builds the enrichment query from an AI candidate's title + authors. */
function queryFor(ai: AICandidate): string {
  return [ai.title, ...(ai.authors ?? [])].join(" ").trim();
}

export async function identifyAndEnrich(
  image: AIImage,
  deps: IdentifyDeps = {},
): Promise<IdentifyResult> {
  const identify = deps.identify ?? identifyBookFromImage;
  const ai = await identify(image);
  if (!ai) return EMPTY;

  const meta = {
    aiConfidence: ai.confidence,
    sourceProvider: ai.sourceProvider,
  };

  // ISBN path: a single canonical candidate, no alternatives.
  if (ai.isbn13) {
    const enriched = await (deps.byIsbn ?? enrichByIsbn)(ai.isbn13);
    if (enriched) return { ...meta, best: enriched, alternatives: [] };
  }

  // Text path: top match is `best`, the rest are alternatives.
  const query = queryFor(ai);
  const results = query ? await (deps.byText ?? searchByText)(query) : [];
  if (results.length > 0) {
    const [best, ...alternatives] = results;
    return { ...meta, best, alternatives };
  }

  // No enrichment match: degrade to the raw AI candidate so the flow completes.
  return { ...meta, best: ai, alternatives: [] };
}
