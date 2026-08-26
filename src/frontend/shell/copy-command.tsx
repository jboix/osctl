// The /copy command runner.

import { copyToClipboard, Notice } from 'inkstand';
import type { CommandContext } from './command-types';
import { pushLine } from './output';

/**
 * Copies the last command output to the clipboard and confirms it. The
 * confirmation keeps the payload, so /copy can be repeated.
 *
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export function runCopy(context: CommandContext): void {
  const copy = context.session.lastCopy;
  if (copy === undefined) {
    pushLine(context.session, 'Nothing to copy.', 'dim');
    return;
  }
  copyToClipboard(copy.text);
  context.session.push(
    <Notice message={`Copied ${copy.label} to clipboard.`} tone="success" />,
    'keep',
  );
}
