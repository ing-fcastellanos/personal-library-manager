import { getAdminFirestore } from "../../lib/firebase/admin";

/**
 * Minimal change log (#15, design D7). On a `Book`/`Copy` edit, the server appends
 * a record of which fields changed, who changed them, and when. This is the
 * foundation for the M8 audit feature (#40) — there is no query UI here, and the
 * document shape is intentionally left extensible.
 */

const COLLECTION = "auditLog";

export type AuditEntity = "book" | "copy";

export interface ChangeRecord {
  entity: AuditEntity;
  entityId: string;
  changedFields: string[];
  readerId: string;
}

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

/**
 * Appends an audit record. A no-op (no changed fields) writes nothing, so callers
 * can pass the diff result unconditionally.
 */
export async function recordChange(record: ChangeRecord): Promise<void> {
  if (record.changedFields.length === 0) return;
  await collection().add({ ...record, at: new Date().toISOString() });
}
