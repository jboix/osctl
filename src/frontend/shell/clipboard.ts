// Copies text to the system clipboard.

import { spawnSync } from 'node:child_process';

/** How the copy reaches the system. Injectable for tests. */
export interface ClipboardIo {
  /** Runs a tool with the text on stdin and reports whether it succeeded. */
  run: (command: string, args: string[], text: string) => boolean;
  /** Writes an escape sequence to the terminal. */
  write: (data: string) => void;
  /** The process platform. */
  platform: NodeJS.Platform;
}

/** The platform tools, tried in order. `clip.exe` covers WSL. */
const TOOLS: Partial<Record<NodeJS.Platform, string[][]>> = {
  darwin: [['pbcopy']],
  linux: [['wl-copy'], ['xclip', '-selection', 'clipboard'], ['clip.exe']],
  win32: [['clip']],
};

/**
 * Copies the text with the first working platform tool, falling back to the
 * OSC 52 escape sequence when no tool is available.
 *
 * @param text - The text to copy.
 * @param io - The system access; defaults to the real process.
 * @returns Which mechanism took the text: a platform tool or OSC 52.
 */
export function copyToClipboard(
  text: string,
  io: ClipboardIo = processIo(),
): 'tool' | 'osc52' {
  for (const [command = '', ...args] of TOOLS[io.platform] ?? []) {
    if (io.run(command, args, text)) {
      return 'tool';
    }
  }
  io.write(`\u001B]52;c;${Buffer.from(text).toString('base64')}\u0007`);
  return 'osc52';
}

/**
 * Builds the real system access.
 *
 * @returns The clipboard io over the current process.
 */
function processIo(): ClipboardIo {
  return {
    run: (command, args, text) =>
      spawnSync(command, args, {
        input: text,
        stdio: ['pipe', 'ignore', 'ignore'],
      }).status === 0,
    write: (data) => void process.stdout.write(data),
    platform: process.platform,
  };
}
