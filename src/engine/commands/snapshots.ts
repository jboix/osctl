// The snapshot commands.

import type { Connection } from '../connection/connection';

/**
 * Asserts that a payload is a plain JSON object.
 *
 * @param payload - The parsed payload.
 * @param what - What the payload holds, named in the error.
 * @returns The payload, typed as an object.
 */
function requireObject(
  payload: unknown,
  what: string,
): Record<string, unknown> {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error(`The payload must be a JSON object with the ${what}.`);
  }
  return payload as Record<string, unknown>;
}

/**
 * Starts taking a snapshot. The call returns once the cluster accepts it;
 * the snapshot itself runs in the background.
 *
 * @param connection - The live connection.
 * @param repo - The repository name.
 * @param name - The snapshot name.
 * @param payload - The parsed JSON snapshot body.
 * @returns Nothing. Throws on an unexpected payload.
 */
export async function createSnapshot(
  connection: Connection,
  repo: string,
  name: string,
  payload: unknown,
): Promise<void> {
  await connection.client.snapshot.create({
    repository: repo,
    snapshot: name,
    body: requireObject(payload, 'snapshot body'),
    wait_for_completion: false,
  });
}

/**
 * Starts restoring a snapshot. The call returns once the cluster accepts
 * it; the restore itself runs in the background.
 *
 * @param connection - The live connection.
 * @param repo - The repository name.
 * @param name - The snapshot name.
 * @param payload - The parsed JSON restore body.
 * @returns Nothing. Throws on an unexpected payload.
 */
export async function restoreSnapshot(
  connection: Connection,
  repo: string,
  name: string,
  payload: unknown,
): Promise<void> {
  await connection.client.snapshot.restore({
    repository: repo,
    snapshot: name,
    body: requireObject(payload, 'restore body'),
  });
}

/**
 * Deletes one snapshot.
 *
 * @param connection - The live connection.
 * @param repo - The repository name.
 * @param name - The snapshot name.
 * @returns Nothing. Throws when the cluster rejects the deletion.
 */
export async function deleteSnapshot(
  connection: Connection,
  repo: string,
  name: string,
): Promise<void> {
  await connection.client.snapshot.delete({ repository: repo, snapshot: name });
}
