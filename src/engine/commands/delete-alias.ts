// The alias removal command.

import type { Connection } from '../connection/connection';

/**
 * Removes an alias from every index it points at.
 *
 * @param connection - The live connection.
 * @param alias - The alias name.
 * @returns The indices the alias was removed from, sorted by name.
 */
export async function deleteAlias(
  connection: Connection,
  alias: string,
): Promise<string[]> {
  const response = await connection.client.indices.getAlias({ name: alias });
  const indices = Object.keys(response.body as Record<string, unknown>).sort();
  await connection.client.indices.deleteAlias({ index: indices, name: alias });
  return indices;
}
