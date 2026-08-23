// The task commands.

import type { Connection } from '../connection/connection';

/** One node failure of the cancel response. */
interface NodeFailure {
  reason?: string;
  caused_by?: { reason?: string };
}

/**
 * Requests the cancellation of one task. Cancellation is asynchronous: the
 * task stops when it next checks for it.
 *
 * @param connection - The live connection.
 * @param id - The task identifier.
 * @returns Nothing. Throws when the cluster reports a failure.
 */
export async function cancelTask(
  connection: Connection,
  id: string,
): Promise<void> {
  const response = await connection.client.tasks.cancel({ task_id: id });
  const body = response.body as { node_failures?: NodeFailure[] };
  const failure = body.node_failures?.[0];
  if (failure !== undefined) {
    throw new Error(
      failure.caused_by?.reason ?? failure.reason ?? 'The cancel failed.',
    );
  }
}
