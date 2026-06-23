import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../lib/firebase/admin";
import type {
  Shelf,
  ShelfCreateInput,
  ShelfUpdateInput,
} from "../../lib/types/shelf";

const COLLECTION = "shelves";

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

function mapDoc(doc: DocumentSnapshot): Shelf {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: data.name,
    location: data.location ?? null,
    description: data.description ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listShelves(): Promise<Shelf[]> {
  const snap = await collection().orderBy("name").get();
  return snap.docs.map(mapDoc);
}

export async function getShelf(id: string): Promise<Shelf | null> {
  const doc = await collection().doc(id).get();
  return doc.exists ? mapDoc(doc) : null;
}

export async function createShelf(input: ShelfCreateInput): Promise<Shelf> {
  const now = new Date().toISOString();
  const ref = collection().doc();
  const data = {
    name: input.name,
    location: input.location ?? null,
    description: input.description ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return { id: ref.id, ...data };
}

export async function updateShelf(
  id: string,
  input: ShelfUpdateInput,
): Promise<Shelf | null> {
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

/** Deletes a shelf. Desasociation of its copies is orchestrated by the route (#12 D3). */
export async function deleteShelf(id: string): Promise<boolean> {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}
