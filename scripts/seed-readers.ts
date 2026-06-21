import { config } from "dotenv";
import { ensureReaderByName } from "../services/readers/repository";

// Load local env (emulator hosts + projectId) when run standalone.
config({ path: ".env.local" });
config();

// Placeholder names — edit them in /ajustes. Emails (for #7 magic-link) are added later.
const READERS = [{ name: "Lector 1" }, { name: "Lector 2" }];

async function main() {
  for (const r of READERS) {
    const { reader, created } = await ensureReaderByName(r);
    // eslint-disable-next-line no-console
    console.log(
      `${created ? "created" : "exists "}  ${reader.name} (${reader.id})`,
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
