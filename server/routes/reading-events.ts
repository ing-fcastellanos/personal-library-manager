import { Router } from "express";
import {
  readingEventCreateSchema,
  readingEventUpdateSchema,
} from "../../lib/types/reading-event";
import {
  listReadingEvents,
  getReadingEvent,
  updateReadingEvent,
  deleteReadingEvent,
  listEventsByBook,
  listEventsByReader,
} from "../../services/reading-events/repository";
import {
  createReadingEvent,
  ReferenceNotFoundError,
} from "../../services/reading-events/service";
import { requireAuth } from "../middleware/require-auth";
import { respondInternal } from "../lib/errors";

/**
 * ReadingEvent API (server-mediated, ADR-0009). Reads are public; writes require
 * a valid session (ADR-0006). Create composes the book snapshot and attributes
 * the event to the body `readerId` (ADR-0013, #12).
 */
const router = Router();

router.get("/reading-events", async (req, res) => {
  try {
    res.json(await listReadingEvents());
  } catch (err) {
    respondInternal(res, req, err);
  }
});

// Relationship reads (#12).
router.get("/books/:bookId/reading-events", async (req, res) => {
  try {
    res.json(await listEventsByBook(req.params.bookId as string));
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.get("/readers/:readerId/reading-events", async (req, res) => {
  try {
    res.json(await listEventsByReader(req.params.readerId as string));
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.get("/reading-events/:id", async (req, res) => {
  try {
    const event = await getReadingEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "not found" });
    res.json(event);
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.post("/reading-events", requireAuth, async (req, res) => {
  const parsed = readingEventCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    res.status(201).json(await createReadingEvent(parsed.data));
  } catch (err) {
    if (err instanceof ReferenceNotFoundError) {
      return res.status(400).json({ error: `unknown ${err.field}` });
    }
    respondInternal(res, req, err);
  }
});

router.patch("/reading-events/:id", requireAuth, async (req, res) => {
  const parsed = readingEventUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const event = await updateReadingEvent(
      req.params.id as string,
      parsed.data,
    );
    if (!event) return res.status(404).json({ error: "not found" });
    res.json(event);
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.delete("/reading-events/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await deleteReadingEvent(req.params.id as string);
    if (!deleted) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch (err) {
    respondInternal(res, req, err);
  }
});

export default router;
