import { Router } from "express";
import { enrichByIsbn, searchByText } from "../../services/enrichment/service";

/**
 * Metadata enrichment API (#13, server-mediated — ADR-0009). A single read
 * endpoint with two internal paths selected by query param (design D1):
 *
 * - `GET /api/enrich?isbn=<isbn>` → at most one canonical candidate (or empty).
 * - `GET /api/enrich?q=<text>`    → up to five ranked candidates.
 *
 * Exactly one of `isbn`/`q` is required; both or neither → 400. Enrichment only
 * suggests metadata; persisting a book is the separate `POST /api/books`
 * (two-step flow). Reads are public, mirroring the catalog read endpoints.
 */
const router = Router();

function firstParam(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

router.get("/enrich", async (req, res) => {
  const isbn = firstParam(req.query.isbn);
  const q = firstParam(req.query.q);

  if ((isbn && q) || (!isbn && !q)) {
    return res
      .status(400)
      .json({ error: "provide exactly one of `isbn` or `q`" });
  }

  try {
    if (isbn) {
      const candidate = await enrichByIsbn(isbn);
      return res.json({ candidate });
    }
    const candidates = await searchByText(q as string);
    return res.json({ candidates });
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

export default router;
