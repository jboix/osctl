import { expect, test } from 'bun:test';
import { diffLines } from './line-diff';

test('diffLines returns nothing for identical texts', () => {
  expect(diffLines('a\nb\nc', 'a\nb\nc')).toEqual([]);
});

test('diffLines shows one hunk with three context lines around a change', () => {
  const before = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].join('\n');
  const after = before.replace('e', 'X');
  expect(diffLines(before, after)).toEqual([
    { sign: '@', text: '@@ -2,7 +2,7 @@' },
    { sign: ' ', text: 'b' },
    { sign: ' ', text: 'c' },
    { sign: ' ', text: 'd' },
    { sign: '-', text: 'e' },
    { sign: '+', text: 'X' },
    { sign: ' ', text: 'f' },
    { sign: ' ', text: 'g' },
    { sign: ' ', text: 'h' },
  ]);
});

test('diffLines separates far apart changes into their own hunks', () => {
  const lines = Array.from({ length: 30 }, (_, i) => `line-${i + 1}`);
  const before = lines.join('\n');
  const changed = [...lines];
  changed[0] = 'first';
  changed[29] = 'last';
  const headers = diffLines(before, changed.join('\n')).filter(
    (line) => line.sign === '@',
  );
  expect(headers).toHaveLength(2);
});

test('diffLines handles texts without a trailing newline cleanly', () => {
  const result = diffLines('a\nb', 'a\nc');
  expect(result).toEqual([
    { sign: '@', text: '@@ -1,2 +1,2 @@' },
    { sign: ' ', text: 'a' },
    { sign: '-', text: 'b' },
    { sign: '+', text: 'c' },
  ]);
});
