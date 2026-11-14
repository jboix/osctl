import { describe, expect, it } from 'bun:test';
import { runRule } from 'vibator/testing';
import rule from './markdown-formatted.ts';

describe('markdown-formatted', () => {
  it('reports the first line that differs from the remark format', async () => {
    const findings = await runRule(rule, {
      files: { 'docs/guide.md': '# Guide\n\nText.\n\n* one\n* two\n' },
    });
    expect(findings).toEqual([
      expect.objectContaining({
        line: 5,
        message: 'The Markdown is not formatted.',
      }),
    ]);
  });

  it('passes a formatted file and skips the changelog', async () => {
    const findings = await runRule(rule, {
      files: {
        'README.md': '# Readme\n\n- one\n- _two_\n',
        'CHANGELOG.md': '# Changelog\n\n* entry\n',
      },
    });
    expect(findings).toEqual([]);
  });
});
