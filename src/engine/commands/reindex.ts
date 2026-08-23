// The reindex command.

import type { Connection } from '../connection/connection';

/**
 * Starts a reindex as a background task.
 *
 * @param connection - The live connection.
 * @param payload - The parsed JSON reindex body, with `source` and `dest`.
 * @returns The task identifier of the running reindex.
 */
export async function reindex(
  connection: Connection,
  payload: unknown,
): Promise<string> {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error('The payload must be a JSON object with the reindex body.');
  }
  const body = payload as Record<string, unknown>;
  if (body.source === undefined || body.dest === undefined) {
    throw new Error('The reindex body needs "source" and "dest".');
  }
  const response = await connection.client.reindex({
    body: payload as { source: { index: string }; dest: { index: string } },
    wait_for_completion: false,
  });
  return (response.body as { task?: string }).task ?? '';
}
