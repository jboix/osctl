import { expect, test } from 'bun:test';
import { parseJsonc } from './jsonc';

test('parseJsonc parses plain JSON', () => {
  expect(parseJsonc('{"a": 1}')).toEqual({ kind: 'ok', payload: { a: 1 } });
});

test('parseJsonc ignores full line comments', () => {
  const text = '// header\n  // indented\n{\n  "a": 1\n}\n';
  expect(parseJsonc(text)).toEqual({ kind: 'ok', payload: { a: 1 } });
});

test('parseJsonc keeps slashes inside strings', () => {
  const text = '{"url": "https://example.org"}';
  expect(parseJsonc(text)).toEqual({
    kind: 'ok',
    payload: { url: 'https://example.org' },
  });
});

test('parseJsonc reports a file with only comments and blanks as empty', () => {
  expect(parseJsonc('// only comments\n\n')).toEqual({ kind: 'empty' });
});

test('parseJsonc reports invalid JSON with a message', () => {
  const result = parseJsonc('{"a": }');
  expect(result.kind).toBe('error');
  if (result.kind === 'error') {
    expect(result.message).toContain('Invalid JSON');
  }
});
