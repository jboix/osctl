import { describe, expect, it } from 'bun:test';
import { runRule } from 'vibator/testing';
import rule from './no-conflict-markers.ts';

describe('no-conflict-markers', () => {
  it('reports the first marker of a file', async () => {
    const findings = await runRule(rule, {
      files: { 'a.ts': 'one\n<<<<<<< HEAD\ntwo\n=======\nthree\n>>>>>>> b\n' },
    });
    expect(findings.map(({ line }) => line)).toEqual([2]);
  });

  it('passes a Markdown rule line of equals signs inside text', async () => {
    const findings = await runRule(rule, {
      files: { 'a.md': '# Title\n\nA ======= B\n' },
    });
    expect(findings).toEqual([]);
  });
});
