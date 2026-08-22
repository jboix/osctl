// The cluster settings command.

import type { Connection } from '../connection/connection';

/** The top-level keys the settings payload may carry. */
const SECTIONS = ['persistent', 'transient'];

/**
 * Updates the cluster settings.
 *
 * @param connection - The live connection.
 * @param payload - The parsed JSON settings: `persistent` and/or `transient`.
 * @returns Nothing. Throws on an unexpected payload.
 */
export async function applyClusterSettings(
  connection: Connection,
  payload: unknown,
): Promise<void> {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error(
      'The payload must be a JSON object with "persistent" and/or "transient" settings.',
    );
  }
  const keys = Object.keys(payload);
  const unknown = keys.filter((key) => !SECTIONS.includes(key));
  if (unknown.length > 0 || keys.length === 0) {
    throw new Error(
      'The payload must hold only "persistent" and "transient" sections, at least one of them.',
    );
  }
  await connection.client.cluster.putSettings({
    body: payload as Record<string, unknown>,
  });
}
