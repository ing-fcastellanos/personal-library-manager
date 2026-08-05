import { z } from "zod";

/**
 * Audit log entry (#40, add-audit-log design D1). Extends the minimal change log
 * #15 introduced (`services/audit/repository.ts`) rather than replacing it: every
 * create/update/delete of a `book`, `copy`, or `readingEvent` appends one entry.
 * `entityLabel` is a title snapshot so an entry stays legible after its entity is
 * deleted (design D1); the acting reader is looked up live from `readers` rather
 * than snapshotted (design D3) — unlike entities, readers are essentially never
 * deleted at this household scale.
 */
export const auditActionSchema = z.enum(["create", "update", "delete"]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditEntityTypeSchema = z.enum(["book", "copy", "readingEvent"]);
export type AuditEntityType = z.infer<typeof auditEntityTypeSchema>;

export const auditLogEntrySchema = z.object({
  id: z.string(),
  readerId: z.string().min(1),
  action: auditActionSchema,
  entityType: auditEntityTypeSchema,
  entityId: z.string().min(1),
  entityLabel: z.string().min(1),
  /** Only meaningful for `action: "update"` — the field names that changed. */
  changedFields: z.array(z.string()).nullish(),
  createdAt: z.string(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
