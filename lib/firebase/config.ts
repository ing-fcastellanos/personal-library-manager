/**
 * Centralized Firebase environment configuration and validation.
 * Client config values are PUBLIC identifiers (safe in the browser bundle),
 * not secrets. See ADR-0002 / ADR-0009.
 */

export const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

/** Whether the client SDK should connect to the local emulators. */
export const useClientEmulator =
  process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === "true";

/** Throws a clear error if any required client config value is missing. */
export function assertClientConfig(): void {
  const missing = Object.entries(firebaseClientConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase client config: ${missing.join(", ")}. ` +
        "Set the NEXT_PUBLIC_FIREBASE_* variables (see .env.example).",
    );
  }
}

/**
 * Project id used by the Admin SDK (server side).
 *
 * NOTE: the Admin SDK (`lib/firebase/admin.ts`) reads projectId and the Storage
 * bucket from `process.env` lazily at init time, not from these module-level
 * consts — the custom server loads `.env*` after these modules are imported, so
 * a module-scope read here can be `undefined`. This export is for client/config
 * consumers only.
 */
export const serverProjectId =
  process.env.GOOGLE_CLOUD_PROJECT ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

/** True when the server should talk to the Firestore emulator (dev). */
export const isServerEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
