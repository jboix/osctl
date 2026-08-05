// The alias actions command.

import type { Connection } from '../connection/connection';

/**
 * Applies alias actions. The payload is an actions array, or an object with
 * an `actions` array, matching the `_aliases` API.
 *
 * @param connection - The live connection.
 * @param payload - The parsed JSON payload.
 * @returns The number of applied actions. Throws on an unexpected payload.
 */
export async function applyAliases(
  connection: Connection,
  payload: unknown,
): Promise<number> {
  const actions = actionsOf(payload);
  if (actions === undefined) {
    throw new Error(
      'The payload must be an actions array, or an object with an "actions" array.',
    );
  }
  await connection.client.indices.updateAliases({
    // The actions come from user JSON; the cluster validates their shape.
    body: { actions: actions as object[] },
  });
  return actions.length;
}

/**
 * Extracts the actions array of the payload.
 *
 * @param payload - The parsed JSON payload.
 * @returns The actions, or undefined when the payload has none.
 */
function actionsOf(payload: unknown): unknown[] | undefined {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (typeof payload === 'object' && payload !== null) {
    const actions = (payload as { actions?: unknown }).actions;
    return Array.isArray(actions) ? actions : undefined;
  }
  return undefined;
}
