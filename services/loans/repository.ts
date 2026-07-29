import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../lib/firebase/admin";
import type { Loan } from "../../lib/types/loan";

const COLLECTION = "loans";

/** Persisted shape of a loan minus server-managed fields. */
export type LoanData = Omit<Loan, "id" | "createdAt" | "updatedAt">;

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

function mapDoc(doc: DocumentSnapshot): Loan {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    copyId: data.copyId,
    borrowerName: data.borrowerName,
    borrowerKey: data.borrowerKey ?? "",
    loanedAt: data.loanedAt,
    dueDate: data.dueDate ?? null,
    returnedAt: data.returnedAt ?? null,
    notes: data.notes ?? null,
    bookId: data.bookId ?? null,
    bookTitle: data.bookTitle,
    bookAuthors: data.bookAuthors ?? [],
    coverUrl: data.coverUrl ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listLoans(): Promise<Loan[]> {
  const snap = await collection().orderBy("createdAt", "desc").get();
  return snap.docs.map(mapDoc);
}

export async function getLoan(id: string): Promise<Loan | null> {
  const doc = await collection().doc(id).get();
  return doc.exists ? mapDoc(doc) : null;
}

/** Pure write. Validation, key derivation and the snapshot live in the service. */
export async function createLoan(data: LoanData): Promise<Loan> {
  const now = new Date().toISOString();
  const ref = collection().doc();
  const doc = { ...data, createdAt: now, updatedAt: now };
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

export async function updateLoan(
  id: string,
  input: Partial<Pick<Loan, "returnedAt" | "dueDate" | "notes">>,
): Promise<Loan | null> {
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

export async function deleteLoan(id: string): Promise<boolean> {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}

/** All loans of a copy (open and returned), most recent first. */
export async function listLoansByCopy(copyId: string): Promise<Loan[]> {
  const snap = await collection()
    .where("copyId", "==", copyId)
    .orderBy("loanedAt", "desc")
    .get();
  return snap.docs.map(mapDoc);
}

/** All loans of a borrower (by normalized key), most recent first. */
export async function listLoansByBorrowerKey(
  borrowerKey: string,
): Promise<Loan[]> {
  const snap = await collection()
    .where("borrowerKey", "==", borrowerKey)
    .orderBy("loanedAt", "desc")
    .get();
  return snap.docs.map(mapDoc);
}

/**
 * The copy's open loan (no `returnedAt`), or null. Filters in memory over the
 * copy's loans so no `(copyId, returnedAt)` index is needed (design D5).
 */
export async function openLoanForCopy(copyId: string): Promise<Loan | null> {
  const loans = await listLoansByCopy(copyId);
  return loans.find((l) => !l.returnedAt) ?? null;
}

/** True if any loan references the copy — used by copy delete-integrity (design D7). */
export async function copyHasLoans(copyId: string): Promise<boolean> {
  const snap = await collection().where("copyId", "==", copyId).limit(1).get();
  return !snap.empty;
}

/** Distinct borrower names already used, for the lend-form autocomplete (design D2). */
export async function distinctBorrowerNames(): Promise<string[]> {
  const loans = await listLoans();
  const seen = new Set<string>();
  const names: string[] = [];
  for (const loan of loans) {
    const name = loan.borrowerName.trim();
    const key = loan.borrowerKey || name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}
