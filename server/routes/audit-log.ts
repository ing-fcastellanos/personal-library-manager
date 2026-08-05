import { Router } from "express";
import { listAuditLog } from "../../services/audit/repository";
import type { AuditEntityType } from "../../lib/types/audit-log";
import { respondInternal } from "../lib/errors";

/**
 * Audit log read API (#40, server-mediated — ADR-0009). Public read, consistent
 * with every other list endpoint in this household app — writing an entry is
 * never a direct client request, only a side effect of book/copy/readingEvent
 * writes (see `server/routes/{books,copies,reading-events,cover,intake}.ts`).
 *
 *   GET /api/audit-log?entityType=&entityId=&limit=
 */
const router = Router();

const ENTITY_TYPES: ReadonlySet<string> = new Set([
  "book",
  "copy",
  "readingEvent",
]);

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function int(value: unknown): number | undefined {
  const n = Number(str(value));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

router.get("/audit-log", async (req, res) => {
  const q = req.query;
  const entityTypeRaw = str(q.entityType);
  try {
    res.json(
      await listAuditLog({
        entityType:
          entityTypeRaw && ENTITY_TYPES.has(entityTypeRaw)
            ? (entityTypeRaw as AuditEntityType)
            : undefined,
        entityId: str(q.entityId),
        limit: int(q.limit),
      }),
    );
  } catch (err) {
    respondInternal(res, req, err);
  }
});

export default router;
