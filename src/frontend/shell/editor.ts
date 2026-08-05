// Opens the configured terminal editor over a temporary JSONC file.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** What the editor launch needs from the terminal owner. */
export interface EditorIo {
  /** Switches the terminal raw mode, off while the editor owns the tty. */
  setRawMode: (raw: boolean) => void;
  /** Repaints the shell after the editor closed. */
  redraw: () => void;
}

/** The edited file after the editor closed. */
export interface EditorResult {
  /** The full file content, comments included. */
  text: string;
  /** The file path, kept so a failed parse loses nothing. */
  path: string;
  /** Whether the editor changed the file. Quitting without saving does not. */
  changed: boolean;
  /** The launch failure, when the editor could not be run. */
  error?: string;
}

/**
 * Writes a temporary JSONC file and opens it in the configured editor,
 * blocking until the editor closes. The editor is `$VISUAL`, then `$EDITOR`,
 * then `vi`.
 *
 * @param slug - The file name part, sanitized.
 * @param header - The comment header lines, without the `//` markers.
 * @param body - The starting JSON body.
 * @param io - The terminal handover callbacks.
 * @returns The edited file content and its path.
 */
export function editText(
  slug: string,
  header: string[],
  body: string,
  io: EditorIo,
): EditorResult {
  const path = join(tmpdir(), `osctl-${slug.replace(/[^\w.-]/g, '_')}.jsonc`);
  const comments = header.map((line) => `// ${line}`).join('\n');
  const written = `${comments}\n${body}\n`;
  writeFileSync(path, written);
  const [command = 'vi', ...args] = editorCommand();
  io.setRawMode(false);
  const outcome = spawnSync(command, [...args, path], { stdio: 'inherit' });
  io.setRawMode(true);
  io.redraw();
  const text = readFileSync(path, 'utf8');
  return {
    text,
    path,
    changed: text !== written,
    error:
      outcome.error === undefined
        ? undefined
        : `The editor "${command}" could not be run: ${outcome.error.message}.`,
  };
}

/**
 * Resolves the editor command, split into the command and its arguments.
 *
 * @returns The command parts, for example `['code', '--wait']`.
 */
function editorCommand(): string[] {
  const raw = process.env.VISUAL ?? process.env.EDITOR ?? 'vi';
  return raw.split(' ').filter((part) => part !== '');
}
