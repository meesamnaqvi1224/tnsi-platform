import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Next's own SWC bundler compiles `.tsx` JSX with the automatic runtime
  // (no `React` identifier needed in scope) - Vite's default esbuild
  // transform does the same for `.tsx` app source today, but test files
  // need the same explicit setting or a bare `<Foo />` in a `.test.tsx`
  // fails with "React is not defined". Matches tsconfig's own JSX intent;
  // no new dependency (`@vitejs/plugin-react` etc.) needed for this alone.
  esbuild: {
    jsx: 'automatic',
  },
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
      // Vitest has no build step that understands tsconfig.json's
      // `"@/*": ["./src/*"]` path mapping the way Next's own bundler
      // does - every Route Handler (`app/api/v1/**/route.ts`) imports
      // `@/lib/...`, so without this alias no route test can import a
      // route module at all, not just this milestone's. Same target
      // tsconfig.json already declares, just taught to Vite/Vitest too.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
