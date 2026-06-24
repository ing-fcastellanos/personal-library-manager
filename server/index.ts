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

config();

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

async function main() {
  const app = express();

  // API layer (Express) — mounted before the Next.js catch-all.
  app.use("/api", express.json());
  app.use("/api", cookieParser());
  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", readersRouter);
  app.use("/api", shelvesRouter);
  // Mounted before booksRouter so `/books/duplicates` is not captured by `/books/:id`.
  app.use("/api", duplicatesRouter);
  app.use("/api", intakeRouter);
  app.use("/api", booksRouter);
  app.use("/api", copiesRouter);
  app.use("/api", readingEventsRouter);
  app.use("/api", enrichRouter);

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
