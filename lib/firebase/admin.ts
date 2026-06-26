import {
  getApps,
  getApp,
  initializeApp,
  type App,
  type AppOptions,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { serverProjectId, serverStorageBucket } from "./config";

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
  // Credentials come from ADC in production (ADR-0001); we only set projectId and
  // the Storage bucket so `storage().bucket()` resolves a default (#15/#20).
  const options: AppOptions = {};
  if (serverProjectId) options.projectId = serverProjectId;
  if (serverStorageBucket) options.storageBucket = serverStorageBucket;
  return initializeApp(Object.keys(options).length > 0 ? options : undefined);
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * Public URL for a Storage object. In development (Storage emulator) this points
 * at the emulator's media endpoint so uploaded covers are actually viewable;
 * otherwise it is the canonical Cloud Storage URL.
 */
export function storageObjectUrl(bucketName: string, path: string): string {
  const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  if (emulator) {
    return `http://${emulator}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`;
  }
  return `https://storage.googleapis.com/${bucketName}/${path}`;
}
