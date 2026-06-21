import next from "next";

/**
 * Wraps the Next.js application and exposes its request handler so the Express
 * server (server/index.ts) can delegate all non-API routes to Next (SSR).
 * See ADR-0003.
 */
export async function createNextHandler(dev: boolean) {
  const app = next({ dev });
  await app.prepare();
  return app.getRequestHandler();
}
