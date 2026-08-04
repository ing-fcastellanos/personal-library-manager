import { Router } from "express";
import { seriesCreateSchema, seriesUpdateSchema } from "../../lib/types/series";
import {
  listSeries,
  getSeries,
  createSeries,
  updateSeries,
  deleteSeries,
} from "../../services/series/repository";
import { requireAuth } from "../middleware/require-auth";
import { respondInternal } from "../lib/errors";

/**
 * Series API (#38, server-mediated — ADR-0009). Reads are public; writes require
 * a valid session (ADR-0006). A series is manually curated — no validation
 * beyond the schema (a volume's `bookId`, if given, isn't checked against a real
 * book, mirroring how a wishlist item's snapshot doesn't require one either).
 */
const router = Router();

router.get("/series", async (req, res) => {
  try {
    res.json(await listSeries());
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.get("/series/:id", async (req, res) => {
  try {
    const series = await getSeries(req.params.id as string);
    if (!series) return res.status(404).json({ error: "not found" });
    res.json(series);
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.post("/series", requireAuth, async (req, res) => {
  const parsed = seriesCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    res.status(201).json(await createSeries(parsed.data));
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.patch("/series/:id", requireAuth, async (req, res) => {
  const parsed = seriesUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const series = await updateSeries(req.params.id as string, parsed.data);
    if (!series) return res.status(404).json({ error: "not found" });
    res.json(series);
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.delete("/series/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await deleteSeries(req.params.id as string);
    if (!deleted) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch (err) {
    respondInternal(res, req, err);
  }
});

export default router;
