import type { RawIdentification } from "./types";

/**
 * Shared vision prompt and response parsing (#19). Both engine modules send the
 * same instruction and ask for strict JSON, then run the raw text through
 * `parseIdentifications` — a pure, defensive parser unit-tested without network.
 * The exact wording is expected to be refined against real images (design Open
 * Questions); the JSON contract it asks for is what the parser relies on.
 */

const JSON_CONTRACT = `Respond with ONLY a JSON object, no prose, no code fences.
Each book has these fields (use null when unknown):
{ "title": string, "authors": string[], "isbn": string|null,
  "publisher": string|null, "year": number|null, "language": string|null,
  "confidence": number /* 0-1, your certainty this reading is correct */ }`;

/** Instruction for a single cover/spine image. */
export const IDENTIFY_SINGLE_INSTRUCTION = `You are identifying a single book from a photo of its cover or spine.
Read the title and author(s) exactly as printed. Do not invent an ISBN.
${JSON_CONTRACT}
Return: { "book": <book> | null } where null means no book is legible.`;

/** Instruction for a shelf photo containing multiple books. */
export const IDENTIFY_MULTI_INSTRUCTION = `You are identifying every book visible in a photo of a shelf.
For each legible spine/cover read the title and author(s) exactly as printed.
Do not invent ISBNs. Skip items you cannot read.
${JSON_CONTRACT}
Return: { "books": [ <book>, ... ] } (empty array if none legible).`;

interface RawBookJson {
  title?: unknown;
  authors?: unknown;
  author?: unknown;
  isbn?: unknown;
  isbn13?: unknown;
  isbn10?: unknown;
  publisher?: unknown;
  year?: unknown;
  publishedYear?: unknown;
  language?: unknown;
  description?: unknown;
  confidence?: unknown;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function authorsOf(book: RawBookJson): string[] {
  if (Array.isArray(book.authors)) {
    return book.authors.map(str).filter((a): a is string => a !== null);
  }
  const single = str(book.author);
  return single ? [single] : [];
}

/** Splits a loose `isbn` field into isbn13/isbn10 by digit length. */
function isbnFields(book: RawBookJson): {
  isbn13: string | null;
  isbn10: string | null;
} {
  const explicit13 = str(book.isbn13);
  const explicit10 = str(book.isbn10);
  if (explicit13 || explicit10)
    return { isbn13: explicit13, isbn10: explicit10 };
  const loose = str(book.isbn);
  if (!loose) return { isbn13: null, isbn10: null };
  const digits = loose.replace(/[\s-]/g, "");
  if (digits.length === 13) return { isbn13: digits, isbn10: null };
  if (digits.length === 10) return { isbn13: null, isbn10: digits };
  return { isbn13: null, isbn10: null };
}

function toRaw(book: RawBookJson): RawIdentification | null {
  const title = str(book.title);
  if (!title) return null;
  const { isbn13, isbn10 } = isbnFields(book);
  return {
    title,
    authors: authorsOf(book),
    isbn13,
    isbn10,
    publisher: str(book.publisher),
    publishedYear: num(book.year) ?? num(book.publishedYear),
    language: str(book.language),
    description: str(book.description),
    confidence: num(book.confidence),
  };
}

/** Strips ```json fences and surrounding prose, returning the JSON substring. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) return body.trim();
  const lastBrace = body.lastIndexOf("}");
  const lastBracket = body.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);
  return end > start ? body.slice(start, end + 1) : body.slice(start);
}

/**
 * Parses an engine's raw text into identifications. Defensive about shape:
 * accepts `{ book }`, `{ books: [] }`, a bare array, or a bare book object.
 * Returns `[]` on unparseable input or no legible books (never throws).
 */
export function parseIdentifications(text: string): RawIdentification[] {
  let data: unknown;
  try {
    data = JSON.parse(extractJson(text));
  } catch {
    return [];
  }

  let items: unknown[];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === "object") {
    const obj = data as { books?: unknown; book?: unknown };
    if (Array.isArray(obj.books)) items = obj.books;
    else if (obj.book && typeof obj.book === "object") items = [obj.book];
    else if (obj.book === null) items = [];
    else items = [data]; // a bare single book object
  } else {
    return [];
  }

  return items
    .filter((i): i is RawBookJson => !!i && typeof i === "object")
    .map(toRaw)
    .filter((r): r is RawIdentification => r !== null);
}
