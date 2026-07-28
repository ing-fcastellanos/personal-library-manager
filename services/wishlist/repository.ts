import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../lib/firebase/admin";
import type {
  WishlistItem,
  WishlistItemUpdateInput,
} from "../../lib/types/wishlist-item";

const COLLECTION = "wishlistItems";

/** Persisted shape of a wishlist item minus server-managed fields. */
export type WishlistItemData = Omit<
  WishlistItem,
  "id" | "createdAt" | "updatedAt"
>;

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

function mapDoc(doc: DocumentSnapshot): WishlistItem {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    readerId: data.readerId,
    bookId: data.bookId ?? null,
    status: data.status ?? "wanted",
    priority: data.priority ?? "normal",
    addedVia: data.addedVia,
    bookTitle: data.bookTitle,
    bookAuthors: data.bookAuthors ?? [],
    isbn13: data.isbn13 ?? null,
    coverUrl: data.coverUrl ?? null,
    titleKey: data.titleKey ?? null,
    authorKeys: data.authorKeys ?? [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listWishlistItems(): Promise<WishlistItem[]> {
  const snap = await collection().orderBy("createdAt", "desc").get();
  return snap.docs.map(mapDoc);
}

export async function getWishlistItem(
  id: string,
): Promise<WishlistItem | null> {
  const doc = await collection().doc(id).get();
  return doc.exists ? mapDoc(doc) : null;
}

/** Pure write. Reference validation and key derivation live in the service (D6). */
export async function createWishlistItem(
  data: WishlistItemData,
): Promise<WishlistItem> {
  const now = new Date().toISOString();
  const ref = collection().doc();
  const doc = { ...data, createdAt: now, updatedAt: now };
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

export async function updateWishlistItem(
  id: string,
  input: WishlistItemUpdateInput,
): Promise<WishlistItem | null> {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) updates[key] = value;
  }
  await ref.set(updates, { merge: true });
  return mapDoc(await ref.get());
}

export async function deleteWishlistItem(id: string): Promise<boolean> {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}

/**
 * Links an item to a catalog book (server-internal, used on acquisition to backfill
 * `bookId` — deliberately not exposed on the public PATCH, design D12).
 */
export async function setWishlistItemBook(
  id: string,
  bookId: string,
): Promise<WishlistItem | null> {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  await ref.set(
    { bookId, updatedAt: new Date().toISOString() },
    { merge: true },
  );
  return mapDoc(await ref.get());
}

/** Wishlist items belonging to a reader (relationship read). */
export async function listWishlistItemsByReader(
  readerId: string,
): Promise<WishlistItem[]> {
  const snap = await collection()
    .where("readerId", "==", readerId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map(mapDoc);
}

/** Wishlist items referencing a book (relationship read + delete integrity). */
export async function listWishlistItemsByBook(
  bookId: string,
): Promise<WishlistItem[]> {
  const snap = await collection().where("bookId", "==", bookId).get();
  return snap.docs.map(mapDoc);
}

/**
 * True if any item references the reader. Exposed so reader deletion (owned by the
 * readers capability, not added here) can refuse to orphan wishlist items (design
 * D10) — mirrors `readerHasEvents`.
 */
export async function readerHasWishlistItems(
  readerId: string,
): Promise<boolean> {
  const snap = await collection()
    .where("readerId", "==", readerId)
    .limit(1)
    .get();
  return !snap.empty;
}

/**
 * Desasociates every item referencing a book by nulling its `bookId` (design D10).
 * Returns the number of items unlinked. Called when a book is deleted — the items
 * remain valid wishes on their own snapshot. Mirrors `unshelveByShelf` for copies.
 */
export async function unlinkWishlistItemsByBook(
  bookId: string,
): Promise<number> {
  const snap = await collection().where("bookId", "==", bookId).get();
  if (snap.empty) return 0;
  const db = getAdminFirestore();
  const batch = db.batch();
  const now = new Date().toISOString();
  for (const doc of snap.docs) {
    batch.set(doc.ref, { bookId: null, updatedAt: now }, { merge: true });
  }
  await batch.commit();
  return snap.size;
}
