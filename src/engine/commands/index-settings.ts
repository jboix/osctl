// The index settings command.

import type { Connection } from '../connection/connection';

/**
 * Updates the settings of one index. The payload holds only the changed
 * keys; a null value resets the setting to its default.
 *
 * @param connection - The live connection.
 * @param name - The index name.
 * @param payload - The changed settings, flat keys.
 * @returns Nothing. Throws on an unexpected or empty payload.
 */
export async function applyIndexSettings(
  connection: Connection,
  name: string,
  payload: unknown,
): Promise<void> {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error('The payload must be a JSON object with flat settings.');
  }
  if (Object.keys(payload).length === 0) {
    throw new Error('The edit changes no settings.');
  }
  await connection.client.indices.putSettings({
    index: name,
    body: payload as Record<string, unknown>,
  });
}
