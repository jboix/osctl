import { describe, expect, it } from 'bun:test';
import { runRule } from 'vibator/testing';
import rule from './markdown-accessible.ts';

/**
 * Runs the rule on one Markdown file.
 *
 * @param content - The Markdown text.
 * @returns The line and message of each finding.
 */
async function check(content: string) {
  const findings = await runRule(rule, { files: { 'doc.md': content } });
  return findings.map(({ line, message }) => ({ line, message }));
}

describe('markdown-accessible', () => {
  it('reports images without alt text, in Markdown and HTML', async () => {
    expect(await check('# Doc\n\n![](a.png)\n\n<img src="b.png">\n')).toEqual([
      { line: 3, message: 'The image has no alt text.' },
      { line: 5, message: 'The image has no alt text.' },
    ]);
  });

  it('reports a skipped heading level and a vague link', async () => {
    expect(await check('# Doc\n\n### Part\n\nSee [here](a.md).\n')).toEqual([
      { line: 3, message: 'The heading jumps from level 1 to level 3.' },
      { line: 5, message: 'The link text "here" does not say where it goes.' },
    ]);
  });

  it('passes alt text, ordered headings, and descriptive links', async () => {
    const doc =
      '# Doc\n\n![The osctl prompt](a.png)\n\n<img src="b.svg" alt="">\n\n## Part\n\nSee [the guide](a.md).\n';
    expect(await check(doc)).toEqual([]);
  });
});
