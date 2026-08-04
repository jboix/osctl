import { expect, test } from 'bun:test';
import type { Key } from 'ink';
import { LineEditor } from './line-editor-machine';

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

/**
 * Types printable text one character at a time.
 *
 * @param editor - The editor to type into.
 * @param text - The text to type.
 * @returns The editor after typing.
 */
function type(editor: LineEditor, text: string): LineEditor {
  let current = editor;
  for (const char of text) {
    current = current.key(char, keyOf());
  }
  return current;
}

test('typing inserts at the caret', () => {
  const editor = type(LineEditor.create(), 'ab')
    .key('', keyOf({ leftArrow: true }))
    .key('c', keyOf());
  expect(editor.value).toBe('acb');
  expect(editor.cursor).toBe(2);
});

test('backspace deletes before the caret, delete removes at the caret', () => {
  const backspaced = type(LineEditor.create(), 'abc').key(
    '',
    keyOf({ backspace: true }),
  );
  expect(backspaced.value).toBe('ab');
  const forward = type(LineEditor.create(), 'abc')
    .key('', keyOf({ leftArrow: true }))
    .key('', keyOf({ leftArrow: true }))
    .key('', keyOf({ delete: true }));
  expect(forward.value).toBe('ac');
  expect(forward.cursor).toBe(1);
});

test('ctrl+a and ctrl+e jump to the line start and end', () => {
  const editor = type(LineEditor.create(), 'abc').key(
    'a',
    keyOf({ ctrl: true }),
  );
  expect(editor.cursor).toBe(0);
  expect(editor.key('e', keyOf({ ctrl: true })).cursor).toBe(3);
});

test('home and end jump to the line start and end', () => {
  const editor = type(LineEditor.create(), 'abc').key(
    '',
    keyOf({ home: true }),
  );
  expect(editor.cursor).toBe(0);
  expect(editor.key('', keyOf({ end: true })).cursor).toBe(3);
});

test('the caret stays inside the line', () => {
  const editor = type(LineEditor.create(), 'a')
    .key('', keyOf({ rightArrow: true }))
    .key('', keyOf({ rightArrow: true }));
  expect(editor.cursor).toBe(1);
  expect(editor.key('', keyOf({ leftArrow: true })).cursor).toBe(0);
});

test('ctrl+w kills the word before the caret, spaces included', () => {
  const once = type(LineEditor.create(), 'index ls  foo').key(
    'w',
    keyOf({ ctrl: true }),
  );
  expect(once.value).toBe('index ls  ');
  expect(once.key('w', keyOf({ ctrl: true })).value).toBe('index ');
});

test('ctrl+u kills to the start, ctrl+k kills to the end', () => {
  const editor = type(LineEditor.create(), 'abcd')
    .key('', keyOf({ leftArrow: true }))
    .key('', keyOf({ leftArrow: true }));
  expect(editor.key('u', keyOf({ ctrl: true })).value).toBe('cd');
  expect(editor.key('k', keyOf({ ctrl: true })).value).toBe('ab');
});

test('meta with the arrows moves word by word', () => {
  const editor = type(LineEditor.create(), 'index ls foo').key(
    '',
    keyOf({ leftArrow: true, meta: true }),
  );
  expect(editor.cursor).toBe(9);
  const back = editor.key('', keyOf({ leftArrow: true, meta: true }));
  expect(back.cursor).toBe(6);
  expect(back.key('', keyOf({ rightArrow: true, meta: true })).cursor).toBe(8);
});

test('enter submits the line and clears the editor', () => {
  const editor = type(LineEditor.create(), '/help').key(
    '',
    keyOf({ return: true }),
  );
  expect(editor.submitted).toBe('/help');
  expect(editor.value).toBe('');
  expect(editor.cursor).toBe(0);
});

test('a pasted chunk ending in a newline submits its text', () => {
  const editor = LineEditor.create().key('sekret\n', keyOf());
  expect(editor.submitted).toBe('sekret');
  expect(editor.value).toBe('');
});

test('the submitted flag lasts one keystroke', () => {
  const editor = type(LineEditor.create(), 'x')
    .key('', keyOf({ return: true }))
    .key('a', keyOf());
  expect(editor.submitted).toBe(undefined);
  expect(editor.value).toBe('a');
});

test('remember stores executed lines once per run', () => {
  const editor = LineEditor.create().remember('/help').remember('/help');
  expect(editor.history).toEqual(['/help']);
  expect(editor.remember('/version').history).toEqual(['/help', '/version']);
});

test('up and down browse the history and restore the draft', () => {
  const editor = type(LineEditor.create(['/version', '/help']), 'dra');
  const back = editor.key('', keyOf({ upArrow: true }));
  expect(back.value).toBe('/help');
  const further = back.key('', keyOf({ upArrow: true }));
  expect(further.value).toBe('/version');
  expect(further.key('', keyOf({ upArrow: true })).value).toBe('/version');
  const down = further.key('', keyOf({ downArrow: true }));
  expect(down.value).toBe('/help');
  expect(down.key('', keyOf({ downArrow: true })).value).toBe('dra');
});

test('ctrl+c clears the line, and interrupts when it is already empty', () => {
  const cleared = type(LineEditor.create(), 'abc').key(
    'c',
    keyOf({ ctrl: true }),
  );
  expect(cleared.value).toBe('');
  expect(cleared.interrupted).toBe(false);
  expect(cleared.key('c', keyOf({ ctrl: true })).interrupted).toBe(true);
});

test('escape clears the line', () => {
  const editor = type(LineEditor.create(), 'abc').key(
    '',
    keyOf({ escape: true }),
  );
  expect(editor.value).toBe('');
});

test('withValue replaces the line and puts the caret at the end', () => {
  const editor = LineEditor.create().withValue('/profile ');
  expect(editor.value).toBe('/profile ');
  expect(editor.cursor).toBe(9);
});
