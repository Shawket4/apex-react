import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsparser,
      // This is a browser bundle: window, document, localStorage, fetch,
      // ResizeObserver, HTMLElement and friends are all real here.
      globals: { ...globals.browser, ...globals.es2021, google: 'readonly' },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Three core rules that TypeScript already enforces, and enforces
      // better. Left on, they fire on things that are not errors at all:
      // `no-undef` cannot see a type-only import or a DOM lib global;
      // `no-unused-vars` counts a type parameter as unused; `no-redeclare`
      // reads a function overload signature as a duplicate. Between them they
      // produced ~700 of this project's ~776 lint messages, which is how a
      // linter stops being read. tsc covers all three — see `npm run build`.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Motion (CLAUDE.md, "Motion"): every animation goes through
      // src/shared/lib/motion. GSAP is private to it (it loads lazily, in its
      // own chunk), and the Radix overlays are wired to it in shared/ui.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['gsap', 'gsap/*', '@gsap/*'],
              message: 'GSAP is private to src/shared/lib/motion; use its hooks and components.',
            },
            {
              group: [
                '@radix-ui/react-dialog',
                '@radix-ui/react-popover',
                '@radix-ui/react-dropdown-menu',
                '@radix-ui/react-select',
                '@radix-ui/react-tooltip',
                '@radix-ui/react-tabs',
              ],
              message: 'Use the shared/ui wrapper: it carries the motion.',
            },
            {
              group: ['tailwindcss-animate', 'tw-animate-css', 'framer-motion', 'motion/react'],
              message: 'Animation goes through src/shared/lib/motion.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...['Literal', 'TemplateElement > .value'].flatMap((node) => [
          {
            selector: `${node}[${node === 'Literal' ? 'value' : 'raw'}=/transition-all/]`,
            message: 'transition-all animates layout; name the properties (transition-colors, transition-transform, …).',
          },
          {
            selector: `${node}[${node === 'Literal' ? 'value' : 'raw'}=/(^|\\s|:)(animate-in|animate-out|fade-in-0|fade-out-0|zoom-in-9|zoom-out-9|slide-in-from-|slide-out-to-)/]`,
            message: 'tailwindcss-animate is gone; overlays and entrances animate through src/shared/lib/motion.',
          },
          {
            selector: `${node}[${node === 'Literal' ? 'value' : 'raw'}=/(^|\\s|:)duration-\\d/]`,
            message: 'Use a duration token: duration-fast | base | slow | count.',
          },
        ]),
      ],
    },
  },
  {
    // The motion system itself, and the shared/ui primitives that wrap Radix.
    files: ['src/shared/lib/motion/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/shared/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['gsap', 'gsap/*', '@gsap/*'],
              message: 'GSAP is private to src/shared/lib/motion; use its hooks and components.',
            },
          ],
        },
      ],
    },
  },
  {
    // Playwright specs are not React. `test.use({ storageState: async ({}, use)
    // => ... })` is the fixture protocol — `use` there is a callback the runner
    // hands you, not React's `use` hook, and rules-of-hooks cannot tell them
    // apart by name.
    files: ['e2e/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
];
