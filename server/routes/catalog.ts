import { Router } from "express";
import { searchCatalog } from "../../services/catalog/service";
import type { CatalogSort, SearchParams } from "../../services/catalog/types";
import type { ReadingStatus } from "../../lib/types/reading-event";

/**
 * Catalog search API (#17, server-mediated — ADR-0009). Public read. All
 * filtering is in-memory (design D1). The reading-status filter is reader-scoped
 * (design D4); the client passes `reader` (its session reader) explicitly.
 *
 *   GET /api/catalog/search?q=&category=&author=&publisher=&shelf=&status=&reader=&sort=&page=&limit=
 */
const router = Router();

const SORTS: ReadonlySet<string> = new Set([
  "title",
  "year",
  "author",
  "addedAt",
]);
const STATUSES: ReadonlySet<string> = new Set([
  "finished",
  "reading",
  "abandoned",
]);

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function int(value: unknown): number | undefined {
  const n = Number(str(value));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

router.get("/catalog/search", async (req, res) => {
  const q = req.query;
  const sortRaw = str(q.sort);
  const statusRaw = str(q.status);
  const params: SearchParams = {
    q: str(q.q),
    category: str(q.category),
    author: str(q.author),
    publisher: str(q.publisher),
    shelf: str(q.shelf),
    status:
      statusRaw && STATUSES.has(statusRaw)
        ? (statusRaw as ReadingStatus)
        : undefined,
    reader: str(q.reader),
    sort: sortRaw && SORTS.has(sortRaw) ? (sortRaw as CatalogSort) : undefined,
    page: int(q.page),
    limit: int(q.limit),
  };
  try {
    res.json(await searchCatalog(params));
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

export default router;
