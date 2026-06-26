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
  // Read env HERE, not at module scope: the custom server loads `.env*` after
  // these modules are imported, so module-level reads would see undefined.
  // Credentials come from ADC in production (ADR-0001); we only set projectId and
  // the Storage bucket so `storage().bucket()` resolves a default (#15/#20).
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    (projectId ? `${projectId}.firebasestorage.app` : undefined);
  const options: AppOptions = {};
  if (projectId) options.projectId = projectId;
  if (storageBucket) options.storageBucket = storageBucket;
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
 * Firebase download URL for a Storage object. The `token` (a per-object download
 * token saved as `firebaseStorageDownloadTokens` metadata at upload) grants read
 * access bypassing `storage.rules` — the same mechanism the Firebase console
 * uses — so covers are viewable in both the emulator and production without
 * opening the rules or making the bucket public. Points at the emulator host in
 * development, `firebasestorage.googleapis.com` otherwise.
 */
export function storageObjectUrl(
  bucketName: string,
  path: string,
  token: string,
): string {
  const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const base = emulator
    ? `http://${emulator}`
    : "https://firebasestorage.googleapis.com";
  return `${base}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
