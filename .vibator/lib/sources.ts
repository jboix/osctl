/** The file sets the project's rules read. */

/** Test files, which the code rules leave alone. */
const TESTS = ['!**/*.test.*', '!**/*.d.ts'];

/** The TypeScript the project writes: the app, the scripts, and these rules. */
export const SOURCES = [
  'src/**/*.{ts,tsx}',
  'scripts/**/*.ts',
  '.vibator/**/*.ts',
  ...TESTS,
];

/** The project's own Markdown. The changelog is generated. */
export const MARKDOWN = ['**/*.md', '!CHANGELOG.md'];
