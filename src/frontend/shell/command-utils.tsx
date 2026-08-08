// Shared helpers of the command runners.

import type { Connection } from '../../engine/engine';
import type { CommandContext } from './command-types';
import { pushLine } from './output';

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
    pushLine(context.session, 'Not connected. Run /profile add.', 'yellow');
  }
  return connection;
}

/**
 * Matches a name against a pattern where `*` matches anything.
 *
 * @param name - The name to test.
 * @param pattern - The pattern; everything matches when omitted.
 * @returns Whether the name matches.
 */
export function matchesPattern(name: string, pattern?: string): boolean {
  if (pattern === undefined) {
    return true;
  }
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`).test(name);
}
