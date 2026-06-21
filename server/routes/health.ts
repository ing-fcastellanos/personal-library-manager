import { Router } from "express";

/**
 * Liveness endpoint used by Cloud Run and CI (ADR-0001).
 * GET /api/health -> 200 { status: "ok" }
 */
const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default router;
