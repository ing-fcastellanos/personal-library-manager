import { beforeEach } from "vitest";
import { clearFirestore } from "./services/test-utils/firestore";

/**
 * Setup for the `integration` Vitest project (#12 design D6). Runs before the
 * data-layer modules are imported, so the Admin SDK picks up a deterministic
 * emulator project id. Hard-fails if the emulator host is absent so these tests
 * can never run against a real Firestore.
 */
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "Integration tests require the Firestore emulator. Run `npm run test:emulator`.",
  );
}

// The Admin SDK reads the project id from GOOGLE_CLOUD_PROJECT (lib/firebase/config).
// `firebase emulators:exec --project demo-plm-test` exposes it as GCLOUD_PROJECT.
process.env.GOOGLE_CLOUD_PROJECT ??=
  process.env.GCLOUD_PROJECT ?? "demo-plm-test";

// `clearFirestore` wipes the whole emulator, so integration files must not run in
// parallel against the shared emulator — `test:emulator` passes
// `--no-file-parallelism` to keep them serial.
beforeEach(async () => {
  await clearFirestore();
});
