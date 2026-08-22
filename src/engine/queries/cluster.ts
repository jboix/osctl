// The cluster queries: information, settings, nodes, and allocation.

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

/** The persistent and transient cluster settings, with flat keys. */
export interface ClusterSettings {
  /** The persistent settings. */
  persistent: Record<string, unknown>;
  /** The transient settings. */
  transient: Record<string, unknown>;
}

/**
 * Reads the persistent and transient cluster settings.
 *
 * @param connection - The live connection.
 * @returns The settings, with flat dotted keys.
 */
export async function clusterSettings(
  connection: Connection,
): Promise<ClusterSettings> {
  const response = await connection.client.cluster.getSettings({
    flat_settings: true,
  });
  const body = response.body as Partial<ClusterSettings>;
  return {
    persistent: body.persistent ?? {},
    transient: body.transient ?? {},
  };
}

/** One node row of /cluster nodes. */
export interface NodeInfo {
  /** The node name. */
  name: string;
  /** The role letters, for example `dim`. */
  roles: string;
  /** Whether the node is the elected cluster manager. */
  manager: boolean;
  /** The OpenSearch version. */
  version: string;
  /** The used heap share, when known. */
  heapPercent?: number;
  /** The recent CPU usage share, when known. */
  cpu?: number;
  /** The one minute load average, when known. */
  load1m?: string;
  /** The five minute load average, when known. */
  load5m?: string;
  /** The fifteen minute load average, when known. */
  load15m?: string;
}

/** One row of the cat nodes response. */
interface CatNodeRow {
  name: string;
  'node.role': string;
  cluster_manager: string;
  version: string;
  'heap.percent': string | null;
  cpu: string | null;
  load_1m: string | null;
  load_5m: string | null;
  load_15m: string | null;
}

/**
 * Lists the nodes with roles, version, heap, CPU, and load.
 *
 * @param connection - The live connection.
 * @returns The nodes sorted by name.
 */
export async function listNodes(connection: Connection): Promise<NodeInfo[]> {
  const response = await connection.client.cat.nodes({
    format: 'json',
    h: [
      'name',
      'node.role',
      'cluster_manager',
      'version',
      'heap.percent',
      'cpu',
      'load_1m',
      'load_5m',
      'load_15m',
    ],
    s: ['name'],
  });
  return (response.body as CatNodeRow[]).map((row) => ({
    name: row.name,
    roles: row['node.role'],
    manager: row.cluster_manager === '*',
    version: row.version,
    heapPercent: numberOf(row['heap.percent']),
    cpu: numberOf(row.cpu),
    load1m: row.load_1m ?? undefined,
    load5m: row.load_5m ?? undefined,
    load15m: row.load_15m ?? undefined,
  }));
}

/**
 * Parses a numeric cat cell.
 *
 * @param cell - The cell value.
 * @returns The number, or undefined when the cell is empty.
 */
function numberOf(cell: string | null): number | undefined {
  return cell === null || cell === '' ? undefined : Number(cell);
}

/** The allocation explanation of one shard. */
export interface AllocationExplanation {
  /** The index name. */
  index: string;
  /** The shard number. */
  shard: number;
  /** Whether the shard is the primary. */
  primary: boolean;
  /** The shard state, for example `unassigned`. */
  currentState: string;
  /** The unassignment reason code, when the shard is unassigned. */
  unassignedReason?: string;
  /** The cluster's summary of the allocation decision. */
  explanation?: string;
  /** The per node decisions with their decider explanations. */
  decisions: NodeDecision[];
}

/** The allocation decision of one node. */
export interface NodeDecision {
  /** The node name. */
  node: string;
  /** The decision, for example `no` or `throttled`. */
  decision: string;
  /** The decider explanations behind the decision. */
  reasons: string[];
}

/** The allocation explain response fields the query reads. */
interface ExplainBody {
  index: string;
  shard: number;
  primary: boolean;
  current_state: string;
  unassigned_info?: { reason?: string };
  allocate_explanation?: string;
  move_explanation?: string;
  rebalance_explanation?: string;
  node_allocation_decisions?: {
    node_name: string;
    node_decision: string;
    deciders?: { explanation?: string }[];
  }[];
}

/**
 * Explains why the first unassigned shard is unassigned.
 *
 * @param connection - The live connection.
 * @returns The explanation, or undefined when no shard is unassigned.
 */
export async function explainAllocation(
  connection: Connection,
): Promise<AllocationExplanation | undefined> {
  let body: ExplainBody;
  try {
    const response = await connection.client.cluster.allocationExplain({});
    body = response.body as ExplainBody;
  } catch (error) {
    if (isNoUnassignedShard(error)) {
      return undefined;
    }
    throw error;
  }
  return {
    index: body.index,
    shard: body.shard,
    primary: body.primary,
    currentState: body.current_state,
    unassignedReason: body.unassigned_info?.reason,
    explanation:
      body.allocate_explanation ??
      body.move_explanation ??
      body.rebalance_explanation,
    decisions: (body.node_allocation_decisions ?? []).map((decision) => ({
      node: decision.node_name,
      decision: decision.node_decision,
      reasons: (decision.deciders ?? []).flatMap((decider) =>
        decider.explanation === undefined ? [] : [decider.explanation],
      ),
    })),
  };
}

/**
 * Detects the error the explain API returns when no shard is unassigned.
 *
 * @param error - The thrown value.
 * @returns Whether the error says there is no unassigned shard.
 */
function isNoUnassignedShard(error: unknown): boolean {
  const meta = (
    error as {
      meta?: { statusCode?: number; body?: { error?: { reason?: string } } };
    } | null
  )?.meta;
  return (
    meta?.statusCode === 400 &&
    (meta.body?.error?.reason ?? '').includes(
      'unable to find any unassigned shards',
    )
  );
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
