import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../lib/firebase/admin";
import type { Series, SeriesVolume } from "../../lib/types/series";

const COLLECTION = "series";

/** Persisted shape of a series minus server-managed fields. */
export type SeriesData = Omit<Series, "id" | "createdAt" | "updatedAt">;

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

function mapVolume(raw: Record<string, unknown>): SeriesVolume {
  return {
    position: raw.position as number,
    title: raw.title as string,
    authors: (raw.authors as string[] | undefined) ?? [],
    isbn13: (raw.isbn13 as string | undefined) ?? null,
    coverUrl: (raw.coverUrl as string | undefined) ?? null,
    bookId: (raw.bookId as string | undefined) ?? null,
  };
}

function mapDoc(doc: DocumentSnapshot): Series {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: data.name,
    volumes: ((data.volumes as Record<string, unknown>[]) ?? []).map(mapVolume),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listSeries(): Promise<Series[]> {
  const snap = await collection().orderBy("createdAt", "desc").get();
  return snap.docs.map(mapDoc);
}

export async function getSeries(id: string): Promise<Series | null> {
  const doc = await collection().doc(id).get();
  return doc.exists ? mapDoc(doc) : null;
}

export async function createSeries(data: SeriesData): Promise<Series> {
  const now = new Date().toISOString();
  const ref = collection().doc();
  const doc = { ...data, createdAt: now, updatedAt: now };
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

/** Replaces `name`/`volumes` wholesale when present (design D5). */
export async function updateSeries(
  id: string,
  input: Partial<Pick<Series, "name" | "volumes">>,
): Promise<Series | null> {
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

export async function deleteSeries(id: string): Promise<boolean> {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}
