import { Router } from "express";
import { findBookDuplicates } from "../../services/duplicates/service";

/**
 * Duplicate pre-check API (#16, server-mediated — ADR-0009). A read-only endpoint
 * the add flows call BEFORE saving so the UI can offer skip / add-as-copy / edit
 * (design D1). Detection only recommends; executing an action reuses the existing
 * catalog endpoints (POST /api/copies, PATCH/POST /api/books).
 *
 *   GET /api/books/duplicates?isbn=<isbn>&title=<text>&authors=a&authors=b
 *
 * At least one of `isbn`/`title` is required → otherwise 400.
 */
const router = Router();

function firstParam(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

/** Express parses repeated `?authors=` into an array and a single one into a string. */
function arrayParam(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (typeof value === "string") return [value];
  return [];
}

router.get("/books/duplicates", async (req, res) => {
  const isbn = firstParam(req.query.isbn);
  const title = firstParam(req.query.title);
  const authors = arrayParam(req.query.authors);

  if (!isbn && !title) {
    return res
      .status(400)
      .json({ error: "provide at least one of `isbn` or `title`" });
  }

  try {
    const result = await findBookDuplicates({ isbn, title, authors });
    res.json(result);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

export default router;
