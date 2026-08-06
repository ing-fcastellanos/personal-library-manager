import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../lib/firebase/admin";
import type {
  AuditAction,
  AuditEntityType,
  AuditLogEntry,
} from "../../lib/types/audit-log";

/**
 * Audit log (#40, design D1). Extends the minimal change log #15 introduced: every
 * create/update/delete of a `book`/`copy`/`readingEvent` appends one entry, with an
 * `entityLabel` snapshot so it stays legible after the entity is deleted. Reads
 * filter in memory over the whole (household-scale) collection — no composite
 * index, same pattern `services/catalog`/`services/loans`/`services/series` use.
 */

const COLLECTION = "auditLog";

export interface ChangeRecord {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  readerId: string;
  /** Only meaningful for `action: "update"`. */
  changedFields?: string[];
}

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

function mapDoc(doc: DocumentSnapshot): AuditLogEntry {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    readerId: data.readerId,
    // Legacy docs written before #40 have no `action` — they only ever came from
    // a PATCH call site, so they were always an update.
    action: data.action ?? "update",
    entityType: data.entityType ?? data.entity,
    entityId: data.entityId,
    entityLabel: data.entityLabel ?? data.entityId,
    changedFields: data.changedFields ?? null,
    createdAt: data.createdAt ?? data.at,
  };
}

/**
 * Appends an audit entry. A no-op update (no changed fields) writes nothing, so
 * callers can pass the diff result unconditionally; a create/delete always writes
 * regardless of `changedFields`, since neither naturally has one.
 */
export async function recordChange(record: ChangeRecord): Promise<void> {
  if (record.action === "update" && (record.changedFields ?? []).length === 0) {
    return;
  }
  const { changedFields, ...rest } = record;
  await collection().add({
    ...rest,
    changedFields: changedFields ?? null,
    createdAt: new Date().toISOString(),
  });
}

export async function listAuditLog(params?: {
  entityType?: AuditEntityType;
  entityId?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const snap = await collection().orderBy("createdAt", "desc").get();
  let entries = snap.docs.map(mapDoc);
  if (params?.entityType) {
    entries = entries.filter((e) => e.entityType === params.entityType);
  }
  if (params?.entityId) {
    entries = entries.filter((e) => e.entityId === params.entityId);
  }
  if (params?.limit) {
    entries = entries.slice(0, params.limit);
  }
  return entries;
}
