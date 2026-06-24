import { config } from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import { createNextHandler } from "./next";
import healthRouter from "./routes/health";
import readersRouter from "./routes/readers";
import authRouter from "./routes/auth";
import shelvesRouter from "./routes/shelves";
import booksRouter from "./routes/books";
import copiesRouter from "./routes/copies";
import readingEventsRouter from "./routes/reading-events";
import enrichRouter from "./routes/enrich";
import duplicatesRouter from "./routes/duplicates";
import intakeRouter from "./routes/intake";
import coverRouter from "./routes/cover";
import catalogRouter from "./routes/catalog";

config();

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

async function main() {
  const app = express();

  // API layer (Express) — mounted before the Next.js catch-all.
  // Cover uploads carry a base64 image (#15 D4): parse this path with a higher
  // limit first; the general parser then no-ops (express.json guards re-parsing).
  app.use("/api/books/:id/cover", express.json({ limit: "8mb" }));
  app.use("/api", express.json());
  app.use("/api", cookieParser());
  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", readersRouter);
  app.use("/api", shelvesRouter);
  // Mounted before booksRouter so `/books/duplicates` is not captured by `/books/:id`.
  app.use("/api", duplicatesRouter);
  app.use("/api", intakeRouter);
  // Mounted before booksRouter so `/books/:id/cover` is not captured by `/books/:id`.
  app.use("/api", coverRouter);
  app.use("/api", booksRouter);
  app.use("/api", copiesRouter);
  app.use("/api", readingEventsRouter);
  app.use("/api", enrichRouter);
  app.use("/api", catalogRouter);

  // Web layer (Next.js SSR) — handles everything else.
  const handle = await createNextHandler(dev);
  app.all("*", (req, res) => handle(req, res));

  app.listen(port, () => {
    console.log(
      `> Personal Library Manager ready on http://localhost:${port} (${
        dev ? "development" : "production"
      })`,
    );
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
