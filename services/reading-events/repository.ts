import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../lib/firebase/admin";
import type {
  ReadingEvent,
  ReadingEventUpdateInput,
} from "../../lib/types/reading-event";

const COLLECTION = "readingEvents";

/** Persisted shape of a reading event minus server-managed fields. */
export type ReadingEventData = Omit<
  ReadingEvent,
  "id" | "createdAt" | "updatedAt"
>;

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

function mapDoc(doc: DocumentSnapshot): ReadingEvent {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    readerId: data.readerId,
    bookId: data.bookId,
    copyId: data.copyId ?? null,
    status: data.status,
    dateStarted: data.dateStarted ?? null,
    dateFinished: data.dateFinished ?? null,
    rating: data.rating ?? null,
    review: data.review ?? null,
    bookTitle: data.bookTitle,
    bookAuthors: data.bookAuthors ?? [],
    isbn13: data.isbn13 ?? null,
    coverUrl: data.coverUrl ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listReadingEvents(): Promise<ReadingEvent[]> {
  const snap = await collection().orderBy("createdAt", "desc").get();
  return snap.docs.map(mapDoc);
}

export async function getReadingEvent(
  id: string,
): Promise<ReadingEvent | null> {
  const doc = await collection().doc(id).get();
  return doc.exists ? mapDoc(doc) : null;
}

/** Pure write. Snapshot composition and validation live in the service (#12 D1). */
export async function createReadingEvent(
  data: ReadingEventData,
): Promise<ReadingEvent> {
  const now = new Date().toISOString();
  const ref = collection().doc();
  const doc = { ...data, createdAt: now, updatedAt: now };
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

export async function updateReadingEvent(
  id: string,
  input: ReadingEventUpdateInput,
): Promise<ReadingEvent | null> {
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

export async function deleteReadingEvent(id: string): Promise<boolean> {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}

/** Reading events for a book (relationship read, #12). */
export async function listEventsByBook(
  bookId: string,
): Promise<ReadingEvent[]> {
  const snap = await collection()
    .where("bookId", "==", bookId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map(mapDoc);
}

/** Reading events for a reader (relationship read, #12). */
export async function listEventsByReader(
  readerId: string,
): Promise<ReadingEvent[]> {
  const snap = await collection()
    .where("readerId", "==", readerId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map(mapDoc);
}

/** True if any event references the book — used by book delete-integrity (#12 D3). */
export async function bookHasEvents(bookId: string): Promise<boolean> {
  const snap = await collection().where("bookId", "==", bookId).limit(1).get();
  return !snap.empty;
}

/**
 * True if any event references the reader. Exposed so reader deletion (owned by the
 * readers capability) can refuse to orphan reading events (#12 D3).
 */
export async function readerHasEvents(readerId: string): Promise<boolean> {
  const snap = await collection()
    .where("readerId", "==", readerId)
    .limit(1)
    .get();
  return !snap.empty;
}
