import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import globals from "globals";

/**
 * Flat config (ESLint 10) over the whole TS tree. `eslint-config-next/core-web-vitals`
 * already bundles the react / react-hooks / jsx-a11y / @next plugins, so we don't
 * re-register them. Per-zone blocks split browser (app/components) from node
 * (server/services/lib/scripts) — console is allowed server-side, warned in the
 * browser. `eslint-config-prettier` is applied last so ESLint never fights Prettier.
 */
const config = [
  {
    ignores: [
      "dist/**",
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
      "*.tsbuildinfo",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextCoreWebVitals,

  // Browser zone
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    rules: { "no-console": "warn" },
  },

  // Node zone
  {
    files: [
      "server/**/*.ts",
      "services/**/*.ts",
      "lib/**/*.ts",
      "scripts/**/*.ts",
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: { "no-console": "off" },
  },

  // Tests (Vitest) + tooling configs. Test files import the Vitest API explicitly,
  // so only node globals are needed here.
  {
    files: ["**/*.test.{ts,tsx}", "vitest.config.ts", "vitest.setup.ts"],
    languageOptions: { globals: { ...globals.node } },
  },

  prettier,
];

export default config;
