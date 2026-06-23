/**
 * Helpers for the emulator-backed integration test lane (#12 design D6).
 *
 * These talk to the Firestore emulator only. To avoid any chance of touching a
 * real project, every helper refuses to run unless `FIRESTORE_EMULATOR_HOST` is
 * set (which `firebase emulators:exec` does automatically).
 */

/** Project id used against the emulator; matches the `demo-` id in `test:emulator`. */
function emulatorProjectId(): string {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    "demo-plm-test"
  );
}

function emulatorHost(): string {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set — refusing to touch Firestore. " +
        "Run integration tests via `npm run test:emulator`.",
    );
  }
  return host;
}

/**
 * Wipes all documents from the Firestore emulator via its admin REST endpoint.
 * Call this between tests so each case starts from a clean store.
 */
export async function clearFirestore(): Promise<void> {
  const url = `http://${emulatorHost()}/emulator/v1/projects/${emulatorProjectId()}/databases/(default)/documents`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(
      `Failed to clear Firestore emulator (${res.status} ${res.statusText})`,
    );
  }
}
