// The cluster health query.

import type { Connection } from '../connection/connection';

/** The cluster health summary shown in the status bar and the connect wizard. */
export interface Health {
  /** The cluster name. */
  clusterName: string;
  /** The health status, for example `green`, `yellow`, or `red`. */
  status: string;
}

/**
 * Reads the cluster name and health status.
 *
 * @param connection - The live connection.
 * @returns The cluster health summary.
 */
export async function health(connection: Connection): Promise<Health> {
  const response = await connection.client.cluster.health({});
  return {
    clusterName: response.body.cluster_name,
    status: response.body.status,
  };
}
