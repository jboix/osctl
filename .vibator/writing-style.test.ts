import { describe, expect, it } from 'bun:test';
import { runRule } from 'vibator/testing';
import rule from './writing-style.ts';

/** An em-dash, built from its code point so this file does not contain one. */
const DASH = String.fromCodePoint(0x2014);

describe('writing-style', () => {
  it('reports an em-dash in a document and in a source string', async () => {
    const findings = await runRule(rule, {
      files: {
        'README.md': `# Readme\n\nFast ${DASH} and small.\n`,
        'src/a.ts': `export const text = 'one ${DASH} two';\n`,
      },
    });
    const found = findings.map(
      ({ file, line }) => `${file?.split('/').pop()}:${line}`,
    );
    expect(found.sort()).toEqual(['README.md:3', 'a.ts:1']);
  });

  it('skips the code of conduct and passes plain punctuation', async () => {
    const findings = await runRule(rule, {
      files: {
        'docs/CODE_OF_CONDUCT.md': `# Code ${DASH} of conduct\n`,
        'README.md': '# Readme\n\nFast, and small.\n',
      },
    });
    expect(findings).toEqual([]);
  });
});
