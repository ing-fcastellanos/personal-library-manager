import type { MappedRow } from "./mapping";
import type { Candidate } from "@/services/enrichment/types";
import type {
  DuplicateMatch,
  Recommendation,
} from "@/services/duplicates/types";

/**
 * Enrichment + duplicate pre-pass for the CSV import wizard (#35, design D4/D5).
 * Sequential, one row at a time — matching `add-book-by-shelf`'s established
 * "processing" loop rather than introducing a new concurrency pattern.
 */

/** Whether a row's default persistence action is to create a new book or reuse a match. */
export type RowAction = "create-new" | "use-existing";

export interface ProcessedRow {
  key: string;
  source: MappedRow;
  candidate: Candidate | null;
  duplicate: DuplicateMatch | null;
  recommendation: Recommendation;
  include: boolean;
  physical: boolean;
  action: RowAction;
}

/** Builds the `/api/enrich` URL for a row (ISBN when present, else title+authors text). */
export function enrichUrl(
  isbn: string | null,
  title: string,
  authors: string[],
): string {
  if (isbn) return `/api/enrich?isbn=${encodeURIComponent(isbn)}`;
  const q = [title, ...authors].join(" ").trim();
  return `/api/enrich?q=${encodeURIComponent(q)}`;
}

/** Builds the `/api/books/duplicates` URL from a candidate's identity. */
export function duplicatesUrl(c: {
  isbn13?: string | null;
  title: string;
  authors?: string[];
}): string {
  const qs = new URLSearchParams();
  if (c.isbn13?.trim()) qs.set("isbn", c.isbn13.trim());
  if (c.title.trim()) qs.set("title", c.title.trim());
  (c.authors ?? []).forEach((a) => qs.append("authors", a));
  return `/api/books/duplicates?${qs.toString()}`;
}

/**
 * Default row action by duplicate tier (design D5): only an exact ISBN match
 * (`add-copy`) defaults to reusing the existing book. Every other
 * recommendation — including the ambiguous `review` tier — defaults to
 * creating a new book, since silently merging into a possibly-wrong existing
 * book is worse than an occasional reader-catchable duplicate.
 */
export function defaultActionFor(recommendation: Recommendation): RowAction {
  return recommendation === "add-copy" ? "use-existing" : "create-new";
}

async function fetchCandidate(row: MappedRow): Promise<Candidate | null> {
  try {
    const res = await fetch(enrichUrl(row.isbn, row.title, row.authors));
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidate?: Candidate | null;
      candidates?: Candidate[];
    };
    return data.candidate ?? data.candidates?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchDuplicates(c: {
  isbn13: string | null;
  title: string;
  authors: string[];
}): Promise<{
  recommendation: Recommendation;
  duplicate: DuplicateMatch | null;
}> {
  try {
    const res = await fetch(duplicatesUrl(c));
    if (!res.ok) return { recommendation: "add-new", duplicate: null };
    const data = (await res.json()) as {
      recommendation?: Recommendation;
      matches?: DuplicateMatch[];
    };
    return {
      recommendation: data.recommendation ?? "add-new",
      duplicate: data.matches?.[0] ?? null,
    };
  } catch {
    return { recommendation: "add-new", duplicate: null };
  }
}

/** Enriches and checks duplicates for one mapped row. */
export async function processRow(
  row: MappedRow,
  key: string,
): Promise<ProcessedRow> {
  const candidate = await fetchCandidate(row);
  const identity = candidate
    ? {
        isbn13: candidate.isbn13,
        title: candidate.title,
        authors: candidate.authors,
      }
    : { isbn13: row.isbn, title: row.title, authors: row.authors };
  const { recommendation, duplicate } = await fetchDuplicates(identity);

  return {
    key,
    source: row,
    candidate,
    duplicate,
    recommendation,
    include: true,
    physical: true,
    action: defaultActionFor(recommendation),
  };
}

/**
 * Processes every surviving row sequentially (design D4), reporting progress
 * after each one so the wizard can drive a progress bar.
 */
export async function processRows(
  rows: MappedRow[],
  onProgress: (done: number, total: number) => void,
): Promise<ProcessedRow[]> {
  const out: ProcessedRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    out.push(await processRow(rows[i], `row-${i}`));
    onProgress(i + 1, rows.length);
  }
  return out;
}
