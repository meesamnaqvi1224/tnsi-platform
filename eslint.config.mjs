import sharedConfig from "@tnsi/config/eslint";

/**
 * Root-level fallback used only by lint-staged, which batches staged files
 * from multiple packages into a single `eslint` invocation run from the
 * repo root — ESLint's flat config resolves from cwd, not per-file
 * directory, so a root config is required for that batched run to find
 * anything at all. Authoritative, framework-aware linting (e.g. Next's
 * `core-web-vitals` rules for apps/web) still runs per-package via
 * `pnpm lint` / `turbo run lint`, where each package's own eslint.config.mjs
 * is used with that package as cwd.
 */
export default sharedConfig;
