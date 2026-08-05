// The pure buffer behind the JSON input box.

import type { Key } from 'ink';

/** The outcome of one keystroke. */
export interface JsonKeyResult {
  /** The next buffer text. */
  text: string;
  /** Whether ctrl+d finished the input. */
  done?: boolean;
  /** Whether the input was cancelled. */
  cancelled?: boolean;
}

/**
 * Applies one keystroke to the buffer. Pasted chunks are appended verbatim,
 * newlines included.
 *
 * @param text - The current buffer text.
 * @param input - The printable characters of the keystroke.
 * @param key - The special-key flags.
 * @returns The next buffer text, or the done or cancelled outcome.
 */
export function applyJsonKey(
  text: string,
  input: string,
  key: Key,
): JsonKeyResult {
  const control = controlOutcome(text, input, key);
  if (control !== undefined) {
    return control;
  }
  return { text: editText(text, input, key) };
}

/**
 * Resolves the control keystrokes: finish, cancel, and clear.
 *
 * @param text - The current buffer text.
 * @param input - The printable characters of the keystroke.
 * @param key - The special-key flags.
 * @returns The outcome, or undefined for an editing keystroke.
 */
function controlOutcome(
  text: string,
  input: string,
  key: Key,
): JsonKeyResult | undefined {
  if (key.ctrl && input === 'd') {
    return { text, done: true };
  }
  if (key.escape || (key.ctrl && input === 'c')) {
    return { text, cancelled: true };
  }
  if (key.ctrl && input === 'u') {
    return { text: '' };
  }
  return undefined;
}

/**
 * Applies an editing keystroke to the buffer text.
 *
 * @param text - The current buffer text.
 * @param input - The printable characters of the keystroke.
 * @param key - The special-key flags.
 * @returns The next buffer text.
 */
function editText(text: string, input: string, key: Key): string {
  if (key.backspace || key.delete) {
    return text.slice(0, -1);
  }
  if (key.return) {
    return `${text}\n`;
  }
  if (input.length === 0 || key.ctrl || key.meta) {
    return text;
  }
  return text + input.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

/**
 * Validates the buffer as JSON.
 *
 * @param text - The buffer text.
 * @returns Undefined when the text parses, the parse error otherwise.
 */
export function jsonError(text: string): string | undefined {
  if (text.trim() === '') {
    return 'The input is empty.';
  }
  try {
    JSON.parse(text);
    return undefined;
  } catch (error) {
    return `Invalid JSON: ${(error as Error).message}`;
  }
}

/**
 * Reports whether a pasted chunk looks like the path of a JSON file.
 *
 * @param chunk - The pasted text.
 * @returns Whether the chunk is a single line ending in `.json`.
 */
export function looksLikeJsonPath(chunk: string): boolean {
  const trimmed = chunk.trim();
  return (
    !trimmed.includes('\n') &&
    !trimmed.startsWith('{') &&
    !trimmed.startsWith('[') &&
    pathFrom(chunk).endsWith('.json')
  );
}

/**
 * Extracts the file path of a pasted chunk, dropping surrounding quotes.
 *
 * @param chunk - The pasted text.
 * @returns The cleaned path.
 */
export function pathFrom(chunk: string): string {
  return chunk.trim().replace(/^['"]/, '').replace(/['"]$/, '');
}
