import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // `validation.ts` imports `@tnsi/integrations`, which transitively
    // imports the Next.js-only `server-only` marker package (it has no
    // real exports - Next's own bundler is what enforces its "server
    // only" contract, nothing here needs its actual behavior). Vitest
    // runs outside Next's bundler, so `server-only` doesn't resolve at
    // all; aliasing it to a real, empty module is the standard fix for
    // testing any code that transitively imports it.
    alias: {
      'server-only': fileURLToPath(new URL('./test/empty-module.ts', import.meta.url)),
    },
  },
});
