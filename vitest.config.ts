import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Three projects mirror the codebase's runtimes: `node` for server/services/lib/
 * scripts (and the `/scan` route handler, which has no DOM), `jsdom` for
 * app/components rendered with React Testing Library, and `integration` for the
 * emulator-backed data-layer tests (`*.integration.test.ts`, #12 design D6). The
 * `integration` lane is excluded from the default `npm test` run by name — it is
 * driven separately via `npm run test:emulator` so the fast/CI lane never needs
 * the Firestore emulator.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the tsconfig `@/*` path alias for Vite/Vitest.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: [
            "{lib,server,services,scripts}/**/*.test.{ts,tsx}",
            "app/**/route.test.ts",
          ],
          // Emulator-backed tests run in the `integration` project, not here.
          exclude: ["**/*.integration.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["{app,components}/**/*.test.{ts,tsx}"],
          exclude: ["app/**/route.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          setupFiles: ["./vitest.integration.setup.ts"],
          include: ["{lib,server,services}/**/*.integration.test.ts"],
        },
      },
    ],
  },
});
