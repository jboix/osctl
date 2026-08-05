// The ISM policy commands.

import type { Connection } from '../connection/connection';
import { getPolicy } from '../queries/policies';

/**
 * Creates or updates an ISM policy. Updates resolve the sequence number and
 * the primary term internally.
 *
 * @param connection - The live connection.
 * @param name - The policy name.
 * @param payload - The parsed JSON payload, with or without the `policy` root.
 * @returns Whether the policy was created or updated.
 */
export async function applyPolicy(
  connection: Connection,
  name: string,
  payload: unknown,
): Promise<'created' | 'updated'> {
  // The policy comes from user JSON; the cluster validates its shape.
  const body = normalize(payload) as never;
  const current = await getPolicy(connection, name);
  if (current === undefined) {
    await connection.client.ism.putPolicy({ policy_id: name, body });
    return 'created';
  }
  await connection.client.ism.putPolicy({
    policy_id: name,
    if_seq_no: current.seqNo,
    if_primary_term: current.primaryTerm,
    body,
  });
  return 'updated';
}

/**
 * Wraps the payload in the `policy` root when it lacks one.
 *
 * @param payload - The parsed JSON payload.
 * @returns The put body. Throws on an unexpected payload.
 */
function normalize(payload: unknown): { policy: unknown } {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error(
      'The payload must be a JSON object with the policy definition.',
    );
  }
  if ('policy' in payload) {
    return payload as { policy: unknown };
  }
  return { policy: payload };
}

/**
 * Deletes one ISM policy.
 *
 * @param connection - The live connection.
 * @param name - The policy name.
 * @returns Nothing. Throws when the cluster rejects the deletion.
 */
export async function deletePolicy(
  connection: Connection,
  name: string,
): Promise<void> {
  await connection.client.ism.deletePolicy({ policy_id: name });
}
