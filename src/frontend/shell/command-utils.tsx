// Shared helpers of the command runners.

import type { Connection } from '../../engine/engine';
import type { CommandContext } from './command-types';
import { pushNotice } from './output';

/**
 * Returns the live connection, reporting when there is none.
 *
 * @param context - What the command can act on.
 * @returns The connection, or undefined after reporting.
 */
export function requireConnection(
  context: CommandContext,
): Connection | undefined {
  const connection = context.session.connection;
  if (connection === undefined) {
    pushNotice(context.session, 'warn', 'Not connected. Run /profile add.');
  }
  return connection;
}
