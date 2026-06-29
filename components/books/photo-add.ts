import type { BookData } from "./types";

/**
 * Pure helpers for the add-by-photo flow (#20). Kept separate from the React
 * container so the candidate→form mapping and intake payload are unit-testable.
 */

const LANGUAGE_LABELS: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  pt: "Portugués",
  fr: "Francés",
};

function languageLabel(code?: string | null): string {
  if (!code) return "Español";
  return LANGUAGE_LABELS[code.toLowerCase()] ?? "Otro";
}

/** An enriched candidate as returned by `POST /api/ai/identify` (`best`/`alternatives`). */
export interface IdentifyCandidate {
  title: string;
  subtitle?: string | null;
  authors?: string[];
  publisher?: string | null;
  publishedYear?: number | null;
  isbn13?: string | null;
  isbn10?: string | null;
  categories?: string[];
  coverUrl?: string | null;
  pageCount?: number | null;
  language?: string | null;
  description?: string | null;
}

export interface IdentifyResponse {
  aiConfidence: number | null;
  sourceProvider: "openai" | "gemini" | null;
  best: IdentifyCandidate | null;
  alternatives: IdentifyCandidate[];
}

/** Maps an identified candidate into the editable book form data. */
export function candidateToBookData(c: IdentifyCandidate): BookData {
  return {
    title: c.title ?? "",
    subtitle: c.subtitle ?? undefined,
    authors: c.authors ?? [],
    publisher: c.publisher ?? undefined,
    year: c.publishedYear != null ? String(c.publishedYear) : undefined,
    isbn13: c.isbn13 ?? undefined,
    isbn10: c.isbn10 ?? undefined,
    categories: c.categories ?? [],
    language: languageLabel(c.language),
    pages: c.pageCount != null ? String(c.pageCount) : undefined,
    description: c.description ?? undefined,
    // The reader's photo is the cover (decision 4) — never the metadata preview.
    coverUrl: undefined,
  };
}

/** Confidence at or below this is treated as "low" and surfaces the alternatives. */
export const LOW_CONFIDENCE = 0.6;

export function isLowConfidence(aiConfidence: number | null): boolean {
  return aiConfidence != null && aiConfidence <= LOW_CONFIDENCE;
}

/** Reads a File into a base64 string (no data-URL prefix) + its content type. */
export function fileToBase64(
  file: File,
): Promise<{ base64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({ base64, contentType: file.type || "image/jpeg" });
    };
    reader.readAsDataURL(file);
  });
}

/** Longest edge (px) a single cover photo is downscaled to before upload. */
export const MAX_IMAGE_EDGE = 1600;
/** Larger edge for shelf photos (#21) so spine text stays legible. */
export const MAX_SHELF_EDGE = 2048;
const JPEG_QUALITY = 0.85;

/**
 * Downscales the captured photo to a sane size as JPEG before upload so it stays
 * under the cover limit (5 MB, #15) and the AI call is cheaper/faster (#20). The
 * max edge is configurable (#21 shelves use a larger one). Falls back to the raw
 * bytes when the browser can't decode/resize (e.g. jsdom), so callers always get
 * usable base64.
 */
export async function prepareImage(
  file: File,
  maxEdge: number = MAX_IMAGE_EDGE,
): Promise<{ base64: string; contentType: string }> {
  try {
    if (typeof createImageBitmap !== "function") return fileToBase64(file);
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileToBase64(file);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return { base64: dataUrl.split(",")[1], contentType: "image/jpeg" };
  } catch {
    return fileToBase64(file);
  }
}

/** Builds the `POST /api/books/intake` payload (book without cover; photo uploaded after). */
export function intakePayload(
  book: BookData,
  copy: { shelfId?: string },
): unknown {
  return {
    book: {
      title: book.title.trim(),
      subtitle: book.subtitle?.trim() || null,
      authors: book.authors,
      publisher: book.publisher?.trim() || null,
      publishedYear: book.year ? Number(book.year) : null,
      isbn13: book.isbn13?.trim() || null,
      isbn10: book.isbn10?.trim() || null,
      categories: book.categories,
      language: book.language?.trim() || null,
      pageCount: book.pages ? Number(book.pages) : null,
      description: book.description?.trim() || null,
    },
    copy: { shelfId: copy.shelfId || null },
  };
}
