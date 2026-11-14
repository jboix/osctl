import { describe, expect, it } from 'bun:test';
import { runRule } from 'vibator/testing';
import rule from './commands-documented.ts';

/** A registry with two commands. */
const REGISTRY =
  "export const commands = [\n  { name: '/index ls' },\n  { name: '/index settings apply' },\n];\n";

describe('commands-documented', () => {
  it('reports a registered command without a row', async () => {
    const findings = await runRule(rule, {
      files: {
        'src/frontend/shell/commands.tsx': REGISTRY,
        'docs/design/commands.md': '| `/index ls [pattern]` | List |\n',
      },
    });
    expect(findings.map(({ line, message }) => ({ line, message }))).toEqual([
      {
        line: 3,
        message:
          'The command "/index settings apply" has no row in docs/design/commands.md.',
      },
    ]);
  });

  it('passes when every command has a row', async () => {
    const findings = await runRule(rule, {
      files: {
        'src/frontend/shell/commands.tsx': REGISTRY,
        'docs/design/commands.md':
          '| `/index ls [pattern]` | List |\n| `/index settings apply [name]` | Edit |\n',
      },
    });
    expect(findings).toEqual([]);
  });
});
