/** The `markdown-formatted` rule: every Markdown file matches the remark format. */
import { defineRule, vibator } from 'vibator';
import { format } from './lib/markdown.ts';
import { MARKDOWN } from './lib/sources.ts';

/**
 * Finds the first line where two texts differ.
 *
 * @param actual - The text as it is.
 * @param formatted - The text as it should be.
 * @returns The 1-based line number.
 */
function firstDifference(actual: string, formatted: string): number {
  const lines = actual.split('\n');
  const expected = formatted.split('\n');
  const index = lines.findIndex((line, i) => line !== expected[i]);
  return (index === -1 ? lines.length : index) + 1;
}

export default defineRule({
  id: 'markdown-formatted',
  title: 'Markdown files match the remark format',
  check: () =>
    vibator.project.files.match(MARKDOWN).flatMap((file) => {
      const formatted = format(file.content);
      if (formatted === file.content) return [];
      return [
        {
          file: file.path,
          line: firstDifference(file.content, formatted),
          message: 'The Markdown is not formatted.',
          expected: "The file matches remark's output with .remarkrc.mjs.",
          fix: 'Run bun run rules:fix, or bun run docs:format.',
        },
      ];
    }),
  fix: (_options, report) => {
    report.diagnostics.forEach(({ file }) => {
      if (file === undefined) return;
      const content = vibator.project.files.get(file).content;
      vibator.project.write(file, format(content));
    });
  },
});
