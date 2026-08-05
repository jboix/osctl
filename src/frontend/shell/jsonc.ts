// Parses the JSON the editor returns, tolerating full line comments.

/** The outcome of parsing an edited file. */
export type JsoncResult =
  | { kind: 'ok'; payload: unknown }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

/**
 * Parses edited JSONC text. Full line comments are dropped; inline comments
 * are not supported, so slashes inside strings are safe.
 *
 * @param text - The raw file content.
 * @returns The parsed payload, empty when only comments and blanks remain,
 * or the parse error.
 */
export function parseJsonc(text: string): JsoncResult {
  const stripped = text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n')
    .trim();
  if (stripped === '') {
    return { kind: 'empty' };
  }
  try {
    return { kind: 'ok', payload: JSON.parse(stripped) };
  } catch (error) {
    return {
      kind: 'error',
      message: `Invalid JSON: ${(error as Error).message}.`,
    };
  }
}
