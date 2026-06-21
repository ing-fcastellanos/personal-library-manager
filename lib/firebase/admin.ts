import {
  getApps,
  getApp,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { serverProjectId } from "./config";

/**
 * Server-side Firebase Admin SDK access (ADR-0009: server-mediated by default).
 *
 * - Production (Cloud Run): authenticates via Application Default Credentials from
 *   the service account — no key file (ADR-0001).
 * - Development: the Admin SDK auto-routes to the Firestore emulator when
 *   FIRESTORE_EMULATOR_HOST is set; only a projectId is required.
 *
 * Lazily initialized as a singleton to avoid duplicate initialization across
 * server modules and Next HMR.
 */
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(
    serverProjectId ? { projectId: serverProjectId } : undefined,
  );
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}
