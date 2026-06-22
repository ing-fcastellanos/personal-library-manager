import { config } from "dotenv";
import {
  ensureReaderByName,
  updateReader,
} from "../services/readers/repository";

// Load local env (emulator hosts + projectId) when run standalone.
config({ path: ".env.local" });
config();

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
    // eslint-disable-next-line no-console
    console.log(
      `${created ? "created" : "exists "}  ${reader.name} <${r.email}> (${reader.id})`,
    );
  }
  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", err);
  process.exit(1);
});
