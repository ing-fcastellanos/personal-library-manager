import { config } from "dotenv";
import {
  ensureReaderByName,
  updateReader,
} from "../services/readers/repository";

// `SEED_TARGET=prod` seeds the REAL Firestore: it skips `.env.local` (which points
// at the emulator), strips any emulator hosts, and requires GOOGLE_CLOUD_PROJECT.
// Credentials come from Application Default Credentials — run
// `gcloud auth application-default login` first. Default (no flag) targets the
// local emulator as before.
const PROD = process.env.SEED_TARGET === "prod";
if (PROD) {
  config(); // .env only — never .env.local
  for (const k of [
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_AUTH_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
  ]) {
    delete process.env[k];
  }
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    console.error("SEED_TARGET=prod requires GOOGLE_CLOUD_PROJECT to be set.");
    process.exit(1);
  }
  console.log(`Seeding PROD Firestore (${process.env.GOOGLE_CLOUD_PROJECT})`);
} else {
  // Load local env (emulator hosts + projectId) when run standalone.
  config({ path: ".env.local" });
  config();
}

// The two household readers. Emails are required for magic-link login (#7).
const READERS = [
  { name: "Frank", email: "ing.fcastellanos@gmail.com" },
  { name: "Dang", email: "dangsol@gmail.com" },
];

async function main() {
  for (const r of READERS) {
    const { reader, created } = await ensureReaderByName({ name: r.name });
    if (reader.email !== r.email) {
      await updateReader(reader.id, { email: r.email });
    }
    console.log(
      `${created ? "created" : "exists "}  ${reader.name} <${r.email}> (${reader.id})`,
    );
  }
  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
