// The component template commands.

import type { Connection } from '../connection/connection';

/**
 * Creates or updates a component template.
 *
 * @param connection - The live connection.
 * @param name - The component template name.
 * @param payload - The parsed JSON component template definition.
 * @returns Nothing. Throws on an unexpected payload.
 */
export async function applyComponent(
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
      'The payload must be a JSON object with the component template definition.',
    );
  }
  await connection.client.cluster.putComponentTemplate({
    name,
    body: payload as { template: Record<string, unknown> },
  });
}

/**
 * Deletes one component template.
 *
 * @param connection - The live connection.
 * @param name - The component template name.
 * @returns Nothing. Throws when the cluster rejects the deletion.
 */
export async function deleteComponent(
  connection: Connection,
  name: string,
): Promise<void> {
  await connection.client.cluster.deleteComponentTemplate({ name });
}
