import { Router } from "express";
import { copyCreateSchema } from "../../lib/types/copy";
import {
  wishlistItemCreateSchema,
  wishlistItemUpdateSchema,
} from "../../lib/types/wishlist-item";
import {
  listWishlistItems,
  getWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  listWishlistItemsByReader,
} from "../../services/wishlist/repository";
import {
  createWishlistItem,
  acquireWishlistItem,
  ReferenceNotFoundError,
  WishlistItemNotFoundError,
} from "../../services/wishlist/service";
import { requireAuth } from "../middleware/require-auth";

/**
 * Wishlist API (#37, server-mediated — ADR-0009). Reads are public; writes require
 * a valid session (ADR-0006). Create composes the match keys and attributes the
 * item to the body `readerId` (ADR-0013). Acquisition creates the owned `Copy`
 * (and the `Book` when the item has none), reusing the intake service (design D12).
 */
const router = Router();

const acquireSchema = copyCreateSchema.omit({ bookId: true }).optional();

router.get("/wishlist-items", async (_req, res) => {
  try {
    res.json(await listWishlistItems());
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.get("/readers/:readerId/wishlist-items", async (req, res) => {
  try {
    res.json(await listWishlistItemsByReader(req.params.readerId as string));
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.get("/wishlist-items/:id", async (req, res) => {
  try {
    const item = await getWishlistItem(req.params.id);
    if (!item) return res.status(404).json({ error: "not found" });
    res.json(item);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.post("/wishlist-items", requireAuth, async (req, res) => {
  const parsed = wishlistItemCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    res.status(201).json(await createWishlistItem(parsed.data));
  } catch (err) {
    if (err instanceof ReferenceNotFoundError) {
      return res.status(400).json({ error: `unknown ${err.field}` });
    }
    res.status(500).json({ error: "internal" });
  }
});

router.patch("/wishlist-items/:id", requireAuth, async (req, res) => {
  const parsed = wishlistItemUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const item = await updateWishlistItem(req.params.id as string, parsed.data);
    if (!item) return res.status(404).json({ error: "not found" });
    res.json(item);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.delete("/wishlist-items/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await deleteWishlistItem(req.params.id as string);
    if (!deleted) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.post("/wishlist-items/:id/acquire", requireAuth, async (req, res) => {
  const parsed = acquireSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const result = await acquireWishlistItem(
      req.params.id as string,
      parsed.data ?? {},
    );
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof WishlistItemNotFoundError) {
      return res.status(404).json({ error: "not found" });
    }
    if (err instanceof ReferenceNotFoundError) {
      return res.status(400).json({ error: `unknown ${err.field}` });
    }
    res.status(500).json({ error: "internal" });
  }
});

export default router;
