import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * Unlike apps/web, this does NOT also layer in `@tnsi/config/eslint`:
 * both that shared config and `eslint-config-expo` register the
 * `@typescript-eslint` plugin, and combining them trips ESLint 9's flat
 * config array ("Cannot redefine plugin"). `eslint-config-expo` already
 * includes typescript-eslint's recommended rules on its own.
 */
const eslintConfig = [
  ...compat.extends('expo'),
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'ios/**',
      'android/**',
      // Tooling config files: CJS by Metro/Babel's own requirement, not
      // app source.
      'metro.config.js',
      'babel.config.js',
    ],
  },
];

export default eslintConfig;
