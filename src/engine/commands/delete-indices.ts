// The index deletion command.

import type { Connection } from '../connection/connection';

/**
 * Deletes the named indices.
 *
 * @param connection - The live connection.
 * @param names - The index names to delete.
 * @returns Nothing. Throws when the cluster rejects the deletion.
 */
export async function deleteIndices(
  connection: Connection,
  names: string[],
): Promise<void> {
  await connection.client.indices.delete({ index: names });
}
