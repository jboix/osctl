import { expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { editText } from './editor';

/**
 * Builds an io fake that records its calls.
 *
 * @returns The recorded calls and the io.
 */
function fakeIo(): {
  calls: string[];
  io: { setRawMode: (raw: boolean) => void; redraw: () => void };
} {
  const calls: string[] = [];
  return {
    calls,
    io: {
      setRawMode: (raw: boolean) => calls.push(`raw:${raw}`),
      redraw: () => calls.push('redraw'),
    },
  };
}

test('editText runs the editor and returns what it wrote', () => {
  const dir = mkdtempSync(join(tmpdir(), 'osctl-test-'));
  const script = join(dir, 'editor.sh');
  writeFileSync(script, '#!/bin/sh\necho \'{"edited": true}\' > "$1"\n', {
    mode: 0o755,
  });
  process.env.VISUAL = script;
  const { calls, io } = fakeIo();
  const result = editText('test-doc', ['header line'], '{}', io);
  delete process.env.VISUAL;
  expect(JSON.parse(result.text)).toEqual({ edited: true });
  expect(result.changed).toBe(true);
  expect(result.error).toBeUndefined();
  expect(calls).toEqual(['raw:false', 'raw:true', 'redraw']);
});

test('editText reports an untouched file, like a vi :q!', () => {
  process.env.VISUAL = 'true';
  const { io } = fakeIo();
  const result = editText('test-keep', ['a', 'b'], '{ "x": 1 }', io);
  delete process.env.VISUAL;
  expect(result.text).toBe('// a\n// b\n{ "x": 1 }\n');
  expect(result.changed).toBe(false);
  expect(result.path).toContain('osctl-test-keep');
});

test('editText reports an editor that could not be run', () => {
  process.env.VISUAL = '/does/not/exist';
  const { calls, io } = fakeIo();
  const result = editText('test-error', [], '{}', io);
  delete process.env.VISUAL;
  expect(result.error).toContain('could not be run');
  expect(calls).toEqual(['raw:false', 'raw:true', 'redraw']);
});
