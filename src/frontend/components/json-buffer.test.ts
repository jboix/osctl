import { expect, test } from 'bun:test';
import type { Key } from 'ink';
import {
  applyJsonKey,
  jsonError,
  looksLikeJsonPath,
  pathFrom,
} from './json-buffer';

const BASE: Key = {
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  pageDown: false,
  pageUp: false,
  home: false,
  end: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  tab: false,
  backspace: false,
  delete: false,
  meta: false,
  super: false,
  hyper: false,
  capsLock: false,
  numLock: false,
};

/**
 * Builds key flags on top of the all-false base.
 *
 * @param flags - The flags to set.
 * @returns The key flags.
 */
function keyOf(flags: Partial<Key> = {}): Key {
  return { ...BASE, ...flags };
}

test('typed and pasted text is appended, newlines included', () => {
  const chunk = '{\r\n  "actions": []\r\n}';
  expect(applyJsonKey('', chunk, keyOf()).text).toBe('{\n  "actions": []\n}');
  expect(applyJsonKey('{', 'a', keyOf()).text).toBe('{a');
});

test('enter adds a newline, backspace deletes, ctrl+u clears', () => {
  expect(applyJsonKey('{', '', keyOf({ return: true })).text).toBe('{\n');
  expect(applyJsonKey('{a', '', keyOf({ backspace: true })).text).toBe('{');
  expect(applyJsonKey('{a', 'u', keyOf({ ctrl: true })).text).toBe('');
});

test('ctrl+d finishes, escape and ctrl+c cancel', () => {
  expect(applyJsonKey('{}', 'd', keyOf({ ctrl: true })).done).toBe(true);
  expect(applyJsonKey('{}', '', keyOf({ escape: true })).cancelled).toBe(true);
  expect(applyJsonKey('{}', 'c', keyOf({ ctrl: true })).cancelled).toBe(true);
});

test('jsonError reports parse problems and the empty buffer', () => {
  expect(jsonError('{ "actions": [] }')).toBe(undefined);
  expect(jsonError('{ nope')).toContain('JSON');
  expect(jsonError('  ')).toBe('The input is empty.');
});

test('a single line ending in .json looks like a path', () => {
  expect(looksLikeJsonPath(' /tmp/actions.json ')).toBe(true);
  expect(looksLikeJsonPath('"/tmp/my file.json"')).toBe(true);
  expect(looksLikeJsonPath('{ "actions": [] }')).toBe(false);
  expect(looksLikeJsonPath('a.json\nb.json')).toBe(false);
});

test('pathFrom trims whitespace and surrounding quotes', () => {
  expect(pathFrom(" '/tmp/my file.json' ")).toBe('/tmp/my file.json');
  expect(pathFrom('"/tmp/a.json"')).toBe('/tmp/a.json');
  expect(pathFrom('/tmp/a.json')).toBe('/tmp/a.json');
});
