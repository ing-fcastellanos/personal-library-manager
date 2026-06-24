import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../lib/firebase/admin";
import { slugify, arraySlugs } from "../../lib/text/slug";
import type {
  Book,
  BookCreateInput,
  BookUpdateInput,
} from "../../lib/types/book";

const COLLECTION = "books";

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

function mapDoc(doc: DocumentSnapshot): Book {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    title: data.title,
    subtitle: data.subtitle ?? null,
    authors: data.authors ?? [],
    authorKeys: data.authorKeys ?? [],
    publisher: data.publisher ?? null,
    publishedYear: data.publishedYear ?? null,
    isbn13: data.isbn13 ?? null,
    isbn10: data.isbn10 ?? null,
    categories: data.categories ?? [],
    categoryKeys: data.categoryKeys ?? [],
    coverUrl: data.coverUrl ?? null,
    pageCount: data.pageCount ?? null,
    language: data.language ?? null,
    description: data.description ?? null,
    workKey: data.workKey ?? null,
    titleKey: data.titleKey ?? null,
    source: data.source ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Derives the slug fields from whichever display fields are present in `fields`
 * (#12 D2). Recomputed on every write so `*Keys`/`titleKey` always track the
 * current `authors`/`categories`/`title`.
 */
function deriveSlugs(fields: {
  title?: string;
  authors?: string[];
  categories?: string[];
}): { titleKey?: string; authorKeys?: string[]; categoryKeys?: string[] } {
  const derived: {
    titleKey?: string;
    authorKeys?: string[];
    categoryKeys?: string[];
  } = {};
  if (fields.title !== undefined) derived.titleKey = slugify(fields.title);
  if (fields.authors !== undefined)
    derived.authorKeys = arraySlugs(fields.authors);
  if (fields.categories !== undefined)
    derived.categoryKeys = arraySlugs(fields.categories);
  return derived;
}

export async function listBooks(): Promise<Book[]> {
  const snap = await collection().orderBy("titleKey").get();
  return snap.docs.map(mapDoc);
}

export async function getBook(id: string): Promise<Book | null> {
  const doc = await collection().doc(id).get();
  return doc.exists ? mapDoc(doc) : null;
}

/**
 * Books whose canonical ISBN-13 equals `isbn13` (duplicate detection #16). Uses a
 * single-field equality (auto-indexed); normally 0–1 results.
 */
export async function findBooksByIsbn13(isbn13: string): Promise<Book[]> {
  const snap = await collection().where("isbn13", "==", isbn13).get();
  return snap.docs.map(mapDoc);
}

/**
 * Books whose derived `titleKey` equals `titleKey` (duplicate detection #16). The
 * author overlap that distinguishes a real match is evaluated in memory by the
 * matcher.
 */
export async function findBooksByTitleKey(titleKey: string): Promise<Book[]> {
  const snap = await collection().where("titleKey", "==", titleKey).get();
  return snap.docs.map(mapDoc);
}

/**
 * Books whose `authorKeys` array contains `authorKey` (duplicate detection #16).
 * Widens the candidate set when titles differ slightly; the matcher still requires
 * a `titleKey` match for a strong classification.
 */
export async function findBooksByAuthorKey(authorKey: string): Promise<Book[]> {
  const snap = await collection()
    .where("authorKeys", "array-contains", authorKey)
    .get();
  return snap.docs.map(mapDoc);
}

export async function createBook(input: BookCreateInput): Promise<Book> {
  const now = new Date().toISOString();
  const ref = collection().doc();
  const authors = input.authors ?? [];
  const categories = input.categories ?? [];
  const data = {
    title: input.title,
    subtitle: input.subtitle ?? null,
    authors,
    publisher: input.publisher ?? null,
    publishedYear: input.publishedYear ?? null,
    isbn13: input.isbn13 ?? null,
    isbn10: input.isbn10 ?? null,
    categories,
    coverUrl: input.coverUrl ?? null,
    pageCount: input.pageCount ?? null,
    language: input.language ?? null,
    description: input.description ?? null,
    workKey: input.workKey ?? null,
    source: input.source ?? null,
    ...deriveSlugs({ title: input.title, authors, categories }),
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return mapDoc(await ref.get());
}

export async function updateBook(
  id: string,
  input: BookUpdateInput,
): Promise<Book | null> {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) updates[key] = value;
  }
  // Recompute slugs for whichever display fields are being changed (#12 D2).
  Object.assign(
    updates,
    deriveSlugs({
      title: input.title,
      authors: input.authors,
      categories: input.categories,
    }),
  );
  await ref.set(updates, { merge: true });
  return mapDoc(await ref.get());
}

export async function deleteBook(id: string): Promise<boolean> {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}
