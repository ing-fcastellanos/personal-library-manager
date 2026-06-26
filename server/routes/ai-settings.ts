import { Router } from "express";
import { z } from "zod";
import {
  readSettings,
  writeSettings,
  testEngine,
} from "../../services/ai/settings";
import { requireAuth } from "../middleware/require-auth";

/**
 * AI settings API (#19b, server-mediated ADR-0009). Lets an authenticated reader
 * read the effective engine config + per-engine status, change the default
 * engine / fallback toggle (persisted to `settings/ai`), and test an engine's
 * connection. Responses carry only the non-sensitive config and a coarse status —
 * never an API key (design D2). All routes require a session (ADR-0006).
 */
const router = Router();

const patchSchema = z
  .object({
    defaultEngine: z.enum(["openai", "gemini"]).optional(),
    fallbackEnabled: z.boolean().optional(),
  })
  .refine(
    (d) => d.defaultEngine !== undefined || d.fallbackEnabled !== undefined,
    { message: "at least one field is required" },
  );

const testSchema = z.object({ engine: z.enum(["openai", "gemini"]) });

router.get("/ai/settings", requireAuth, async (_req, res) => {
  try {
    res.json(await readSettings());
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.patch("/ai/settings", requireAuth, async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    res.json(await writeSettings(parsed.data));
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.post("/ai/test", requireAuth, async (req, res) => {
  const parsed = testSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    res.json({ status: await testEngine(parsed.data.engine) });
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

export default router;
