import { describe, expect, it } from 'bun:test';
import { runRule } from 'vibator/testing';
import rule from './tsdoc-coverage.ts';

/**
 * Runs the rule on one source file.
 *
 * @param content - The TypeScript text.
 * @returns The message of each finding.
 */
async function check(content: string) {
  const findings = await runRule(rule, { files: { 'src/a.ts': content } });
  return findings.map(({ message }) => message);
}

describe('tsdoc-coverage', () => {
  it('reports a function without TSDoc', async () => {
    expect(await check('export function a() {}\n')).toEqual([
      'a: needs a TSDoc block',
    ]);
  });

  it('reports a missing @param and a missing @returns', async () => {
    const source =
      '/** Adds. */\nexport const add = (a: number, b: number) => a + b;\n';
    expect(await check(source)).toEqual([
      'add: missing @param for "a"',
      'add: missing @param for "b"',
      'add: missing @returns',
    ]);
  });

  it('checks class methods', async () => {
    expect(await check('export class A {\n  run(): void {}\n}\n')).toEqual([
      'A.run: needs a TSDoc block',
    ]);
  });

  it('passes a complete block and skips test files', async () => {
    const source =
      '/**\n * Doubles.\n *\n * @param n - A number.\n * @returns Twice n.\n */\nexport function double(n: number) {\n  return n * 2;\n}\n';
    expect(await check(source)).toEqual([]);
    const findings = await runRule(rule, {
      files: { 'src/a.test.ts': 'function a() {}\n' },
    });
    expect(findings).toEqual([]);
  });
});
