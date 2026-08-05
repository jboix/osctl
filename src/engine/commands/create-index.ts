// The index creation command.

import type { Connection } from '../connection/connection';

/**
 * Creates an index. Settings, mappings, and aliases come from the matching
 * templates and the optional body.
 *
 * @param connection - The live connection.
 * @param name - The index name.
 * @param body - The parsed JSON creation body, omitted for a plain create.
 * @returns Nothing. Throws on an unexpected body.
 */
export async function createIndex(
  connection: Connection,
  name: string,
  body?: unknown,
): Promise<void> {
  if (body === undefined) {
    await connection.client.indices.create({ index: name });
    return;
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('The body must be a JSON object.');
  }
  await connection.client.indices.create({
    index: name,
    body: body as Record<string, unknown>,
  });
}
