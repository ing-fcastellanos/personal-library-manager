import { Router } from "express";
import { readerUpdateSchema, toClientReader } from "../../lib/types/reader";
import {
  listReaders,
  getReader,
  updateReader,
  ReaderEmailConflictError,
} from "../../services/readers/repository";
import { requireAuth } from "../middleware/require-auth";
import { respondInternal } from "../lib/errors";

/**
 * Reader profile API (server-mediated, ADR-0009). Reads are public; writes
 * require a valid session (ADR-0006).
 */
const router = Router();

router.get("/readers", async (req, res) => {
  try {
    res.json((await listReaders()).map(toClientReader));
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.get("/readers/:id", async (req, res) => {
  try {
    const reader = await getReader(req.params.id);
    if (!reader) return res.status(404).json({ error: "not found" });
    res.json(toClientReader(reader));
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.patch("/readers/:id", requireAuth, async (req, res) => {
  const parsed = readerUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const reader = await updateReader(req.params.id as string, parsed.data);
    if (!reader) return res.status(404).json({ error: "not found" });
    res.json(toClientReader(reader));
  } catch (err) {
    if (err instanceof ReaderEmailConflictError) {
      return res.status(409).json({ error: "email already in use" });
    }
    respondInternal(res, req, err);
  }
});

export default router;
