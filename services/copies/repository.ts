import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../lib/firebase/admin";
import type {
  Copy,
  CopyCreateInput,
  CopyUpdateInput,
} from "../../lib/types/copy";

const COLLECTION = "copies";

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

function mapDoc(doc: DocumentSnapshot): Copy {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    bookId: data.bookId,
    shelfId: data.shelfId ?? null,
    condition: data.condition ?? null,
    acquiredAt: data.acquiredAt ?? null,
    notes: data.notes ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listCopies(): Promise<Copy[]> {
  const snap = await collection().orderBy("createdAt").get();
  return snap.docs.map(mapDoc);
}

export async function getCopy(id: string): Promise<Copy | null> {
  const doc = await collection().doc(id).get();
  return doc.exists ? mapDoc(doc) : null;
}

/** Pure write. Referential validation lives in the copies service (#12 D1/D3). */
export async function createCopy(input: CopyCreateInput): Promise<Copy> {
  const now = new Date().toISOString();
  const ref = collection().doc();
  const data = {
    bookId: input.bookId,
    shelfId: input.shelfId ?? null,
    condition: input.condition ?? null,
    acquiredAt: input.acquiredAt ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return { id: ref.id, ...data };
}

export async function updateCopy(
  id: string,
  input: CopyUpdateInput,
): Promise<Copy | null> {
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

export async function deleteCopy(id: string): Promise<boolean> {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}

/** Copies belonging to a book (relationship read, #12). */
export async function listCopiesByBook(bookId: string): Promise<Copy[]> {
  const snap = await collection()
    .where("bookId", "==", bookId)
    .orderBy("createdAt")
    .get();
  return snap.docs.map(mapDoc);
}

/** True if any copy references the book — used by book delete-integrity (#12 D3). */
export async function bookHasCopies(bookId: string): Promise<boolean> {
  const snap = await collection().where("bookId", "==", bookId).limit(1).get();
  return !snap.empty;
}

/**
 * Desasociates every copy on a shelf by nulling its `shelfId` (#12 D3). Returns the
 * number of copies unshelved. Called when a shelf is deleted.
 */
export async function unshelveByShelf(shelfId: string): Promise<number> {
  const snap = await collection().where("shelfId", "==", shelfId).get();
  if (snap.empty) return 0;
  const db = getAdminFirestore();
  const batch = db.batch();
  const now = new Date().toISOString();
  for (const doc of snap.docs) {
    batch.set(doc.ref, { shelfId: null, updatedAt: now }, { merge: true });
  }
  await batch.commit();
  return snap.size;
}
