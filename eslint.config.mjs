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
 *
 * apps/mobile is excluded here: its own eslint.config.mjs pulls in
 * `eslint-config-expo` (react-hooks/react-native rules this generic
 * fallback has no plugin for, so an inline `eslint-disable` comment
 * referencing one of those rules errors as "rule not found" instead of
 * disabling anything) and ignores its CJS tooling configs
 * (metro.config.js/babel.config.js). `pnpm lint`/`turbo run lint` remain
 * the authoritative check for apps/mobile, same as apps/web.
 */
export default [...sharedConfig, { ignores: ["apps/mobile/**"] }];
