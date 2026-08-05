// The index template commands.

import type { Connection } from '../connection/connection';

/**
 * Creates or updates an index template.
 *
 * @param connection - The live connection.
 * @param name - The template name.
 * @param payload - The parsed JSON template definition.
 * @returns Nothing. Throws on an unexpected payload.
 */
export async function applyTemplate(
  connection: Connection,
  name: string,
  payload: unknown,
): Promise<void> {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error(
      'The payload must be a JSON object with the template definition.',
    );
  }
  await connection.client.indices.putIndexTemplate({
    name,
    body: payload as Record<string, unknown>,
  });
}

/**
 * Deletes one index template.
 *
 * @param connection - The live connection.
 * @param name - The template name.
 * @returns Nothing. Throws when the cluster rejects the deletion.
 */
export async function deleteTemplate(
  connection: Connection,
  name: string,
): Promise<void> {
  await connection.client.indices.deleteIndexTemplate({ name });
}
