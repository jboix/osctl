// A line based diff between two texts, rendered as git style hunks.

import { structuredPatch } from 'diff';

/** One line of a diff or a preview. */
export interface DiffLine {
  /**
   * The marker: `+` added, `-` removed, `@` a hunk header, a space for
   * unchanged lines.
   */
  sign: '+' | '-' | ' ' | '@';
  /** The line content, without the marker. */
  text: string;
}

/** The unchanged lines shown around every change. */
const CONTEXT = 3;

/**
 * Diffs two texts line by line. Unchanged regions are collapsed: each change
 * appears as a hunk with a `@@ -old,count +new,count @@` header and three
 * context lines, like git.
 *
 * @param before - The old text.
 * @param after - The new text.
 * @returns The hunk lines, empty when the texts are equal.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const patch = structuredPatch(
    'before',
    'after',
    withNewline(before),
    withNewline(after),
    undefined,
    undefined,
    { context: CONTEXT },
  );
  return patch.hunks.flatMap((hunk) => [
    {
      sign: '@' as const,
      text: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
    },
    ...hunk.lines.map(toLine),
  ]);
}

/**
 * Converts one patch line to a diff line.
 *
 * @param line - The patch line, its first character is the marker.
 * @returns The diff line.
 */
function toLine(line: string): DiffLine {
  const sign = line[0];
  return {
    sign: sign === '+' || sign === '-' ? sign : ' ',
    text: line.slice(1),
  };
}

/**
 * Appends a trailing newline when the text has none, so the patch carries no
 * "no newline at end of file" markers.
 *
 * @param text - The text to diff.
 * @returns The text, ending with a newline.
 */
function withNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}
