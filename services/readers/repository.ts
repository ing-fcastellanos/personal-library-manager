import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../lib/firebase/admin";
import type {
  Reader,
  ReaderCreateInput,
  ReaderUpdateInput,
} from "../../lib/types/reader";

const COLLECTION = "readers";

/** Thrown when a Firebase uid is already linked to a different reader. */
export class ReaderUidConflictError extends Error {
  constructor(uid: string) {
    super(`uid already assigned to another reader: ${uid}`);
    this.name = "ReaderUidConflictError";
  }
}

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

function mapDoc(doc: DocumentSnapshot): Reader {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: data.name,
    avatar: data.avatar ?? null,
    displayColor: data.displayColor ?? null,
    goodreadsUrl: data.goodreadsUrl ?? null,
    preferences: data.preferences ?? {},
    uid: data.uid ?? null,
    pinHash: data.pinHash ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listReaders(): Promise<Reader[]> {
  const snap = await collection().orderBy("name").get();
  return snap.docs.map(mapDoc);
}

export async function getReader(id: string): Promise<Reader | null> {
  const doc = await collection().doc(id).get();
  return doc.exists ? mapDoc(doc) : null;
}

export async function createReader(
  input: ReaderCreateInput & { uid?: string | null },
): Promise<Reader> {
  const now = new Date().toISOString();
  const ref = collection().doc();
  const data = {
    name: input.name,
    avatar: input.avatar ?? null,
    displayColor: input.displayColor ?? null,
    goodreadsUrl: input.goodreadsUrl ?? null,
    preferences: input.preferences ?? {},
    uid: input.uid ?? null,
    pinHash: null,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return { id: ref.id, ...data };
}

export async function updateReader(
  id: string,
  input: ReaderUpdateInput,
): Promise<Reader | null> {
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

/**
 * Links a Firebase Auth user to a reader (1:1, ADR-0011). Reserved for auth (#7).
 * Enforces uid uniqueness via a transaction (Firestore has no unique constraint).
 */
export async function assignUid(readerId: string, uid: string): Promise<void> {
  const db = getAdminFirestore();
  await db.runTransaction(async (tx) => {
    const dup = await tx.get(collection().where("uid", "==", uid).limit(1));
    if (!dup.empty && dup.docs[0].id !== readerId) {
      throw new ReaderUidConflictError(uid);
    }
    tx.set(
      collection().doc(readerId),
      { uid, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  });
}

/** Idempotent seed helper: creates a reader matching `name` only if none exists. */
export async function ensureReaderByName(
  input: ReaderCreateInput,
): Promise<{ reader: Reader; created: boolean }> {
  const existing = await collection()
    .where("name", "==", input.name)
    .limit(1)
    .get();
  if (!existing.empty) {
    return { reader: mapDoc(existing.docs[0]), created: false };
  }
  return { reader: await createReader(input), created: true };
}
