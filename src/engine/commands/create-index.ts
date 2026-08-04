// The index creation command.

import type { Connection } from '../connection/connection';

/**
 * Creates an index. Settings and mappings come from the matching templates.
 *
 * @param connection - The live connection.
 * @param name - The index name.
 * @returns Nothing. Throws when the cluster rejects the creation.
 */
export async function createIndex(
  connection: Connection,
  name: string,
): Promise<void> {
  await connection.client.indices.create({ index: name });
}
