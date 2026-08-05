// The cluster information query.

import type { Connection } from '../connection/connection';

/** The cluster state beyond the plain health status. */
export interface ClusterInfo {
  /** The cluster name. */
  clusterName: string;
  /** The health status. */
  status: string;
  /** The number of nodes. */
  nodes: number;
  /** The number of unassigned shards. */
  unassignedShards: number;
  /** The active block descriptions, cluster wide and per index. */
  blocks: string[];
  /** The disk usage per node. */
  disk: { node: string; percent?: number }[];
}

/**
 * Reads the cluster health, the active blocks, and the disk usage.
 *
 * @param connection - The live connection.
 * @returns The cluster information.
 */
export async function clusterInfo(
  connection: Connection,
): Promise<ClusterInfo> {
  const [health, state, allocation] = await Promise.all([
    connection.client.cluster.health({}),
    connection.client.cluster.state({ metric: ['blocks'] }),
    connection.client.cat.allocation({ format: 'json' }),
  ]);
  const summary = health.body as HealthBody;
  return {
    clusterName: summary.cluster_name,
    status: summary.status,
    nodes: summary.number_of_nodes,
    unassignedShards: summary.unassigned_shards,
    blocks: blockDescriptions(state.body as BlocksBody),
    disk: (allocation.body as AllocationRow[]).map((row) => ({
      node: row.node,
      percent:
        row['disk.percent'] === null || row['disk.percent'] === undefined
          ? undefined
          : Number(row['disk.percent']),
    })),
  };
}

/** The health response fields the query reads. */
interface HealthBody {
  cluster_name: string;
  status: string;
  number_of_nodes: number;
  unassigned_shards: number;
}

/** The blocks metric of the cluster state. */
interface BlocksBody {
  blocks?: {
    global?: Record<string, { description?: string }>;
    indices?: Record<string, Record<string, { description?: string }>>;
  };
}

/** One row of the cat allocation response. */
interface AllocationRow {
  node: string;
  'disk.percent'?: string | null;
}

/**
 * Flattens the global and per-index block descriptions.
 *
 * @param body - The blocks metric of the cluster state.
 * @returns The block descriptions, global ones first.
 */
function blockDescriptions(body: BlocksBody): string[] {
  const globals = Object.values(body.blocks?.global ?? {}).map(
    (block) => block.description ?? 'unknown block',
  );
  const perIndex = Object.entries(body.blocks?.indices ?? {}).flatMap(
    ([index, blocks]) =>
      Object.values(blocks).map(
        (block) => `${index}: ${block.description ?? 'unknown block'}`,
      ),
  );
  return [...globals, ...perIndex];
}
