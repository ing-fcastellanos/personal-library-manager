import { Router } from "express";
import {
  enrichByIsbn,
  searchByText,
  searchCoverByPublisher,
} from "../../services/enrichment/service";
import { respondInternal } from "../lib/errors";

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
 *
 * A third, separate path (#22) searches for a cover scoped to a specific
 * publisher — a different shape (always a ranked list, never a single
 * candidate) than the `isbn`/`q` mutual-exclusion above, so it's its own route
 * rather than a third mode on `/enrich`.
 */
const router = Router();

function firstParam(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

/** Normalizes a possibly-repeated query param (`authors=a&authors=b`) to a
 * string list, dropping anything blank or non-string. */
function paramList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  return raw
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
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
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.get("/enrich/cover-by-publisher", async (req, res) => {
  const title = firstParam(req.query.title);
  const publisher = firstParam(req.query.publisher);
  const authors = paramList(req.query.authors);

  if (!title || !publisher) {
    return res
      .status(400)
      .json({ error: "`title` and `publisher` are required" });
  }

  try {
    const candidates = await searchCoverByPublisher(title, authors, publisher);
    return res.json({ candidates });
  } catch (err) {
    respondInternal(res, req, err);
  }
});

export default router;
