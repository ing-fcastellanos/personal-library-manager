import { config } from "dotenv";
import express from "express";
import { createNextHandler } from "./next";
import healthRouter from "./routes/health";

config();

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

async function main() {
  const app = express();

  // API layer (Express) — mounted before the Next.js catch-all.
  app.use("/api", healthRouter);

  // Web layer (Next.js SSR) — handles everything else.
  const handle = await createNextHandler(dev);
  app.all("*", (req, res) => handle(req, res));

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `> Personal Library Manager ready on http://localhost:${port} (${
        dev ? "development" : "production"
      })`,
    );
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});
