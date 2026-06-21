import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * Shared flat ESLint config for non-Next.js workspace packages.
 * Next.js apps extend `next/core-web-vitals` directly and layer this in
 * alongside it rather than replacing it.
 */
const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["node_modules/**", "dist/**", ".turbo/**"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
);

export default baseConfig;
