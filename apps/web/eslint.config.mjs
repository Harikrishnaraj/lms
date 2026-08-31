import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// apps/web previously had no local ESLint config, so `next build`'s
// built-in lint step fell back to the monorepo root's eslint.config.mjs
// (plain @eslint/js + typescript-eslint recommended, no Next-specific or
// jsx-a11y rules). That meant the `// eslint-disable-next-line
// jsx-a11y/media-has-caption` comment in the video player referenced a
// rule ESLint didn't know about, which is itself a lint error under
// flat config. Extending next/core-web-vitals here (via eslint-config-next,
// already a devDependency) is what actually wires up the Next.js plugin
// and jsx-a11y rules that this app's disable-comments assume are active.
const eslintConfig = [
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**', '**/coverage/**'],
  },
];

export default eslintConfig;
