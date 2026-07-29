import { Router } from "express";
import { getAdminFirestore } from "../../lib/firebase/admin";

/**
 * Health endpoints:
 * - GET /api/health        liveness (no external deps) — used by Cloud Run (ADR-0001)
 * - GET /api/health/ready  readiness — verifies Firestore connectivity
 */
const router = Router();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/health/ready", async (req, res) => {
  try {
    // Cheap round-trip to confirm Firestore (or its emulator) is reachable.
    await withTimeout(getAdminFirestore().listCollections(), 2000);
    res.status(200).json({ status: "ready" });
  } catch (err) {
    // Log the cause before the 503 — a mute readiness failure is exactly what made
    // the #3 Cloud Run deploy hard to diagnose (#65).
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    res.status(503).json({ status: "unavailable" });
  }
});

export default router;
