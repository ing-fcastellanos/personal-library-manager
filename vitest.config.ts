import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Two projects mirror the dual-runtime codebase: `node` for server/services/lib/
 * scripts (and the `/scan` route handler, which has no DOM), `jsdom` for
 * app/components rendered with React Testing Library.
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
    ],
  },
});
