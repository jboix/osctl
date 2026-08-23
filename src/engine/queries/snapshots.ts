// The snapshot queries: repositories, listings, and definitions.

import type { Connection } from '../connection/connection';
import { statusOf } from '../connection/failure';

/** One repository row of /snapshot repo ls. */
export interface RepoInfo {
  /** The repository name. */
  name: string;
  /** The repository type, for example `fs` or `s3`. */
  type: string;
}

/**
 * Lists the snapshot repositories.
 *
 * @param connection - The live connection.
 * @returns The repositories sorted by name.
 */
export async function listRepositories(
  connection: Connection,
): Promise<RepoInfo[]> {
  const response = await connection.client.snapshot.getRepository({});
  const body = response.body as Record<string, { type?: string }>;
  return Object.entries(body)
    .map(([name, repository]) => ({ name, type: repository.type ?? '' }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One snapshot row of /snapshot ls. */
export interface SnapshotInfo {
  /** The repository holding the snapshot. */
  repository: string;
  /** The snapshot name. */
  name: string;
  /** The snapshot state, for example `SUCCESS` or `IN_PROGRESS`. */
  state: string;
  /** The number of indices in the snapshot. */
  indices: number;
  /** The start time, ISO formatted. */
  startTime: string;
  /** The duration, human readable. */
  duration: string;
  /** The number of shard failures. */
  failures: number;
}

/** One entry of the snapshot get response. */
interface SnapshotEntry {
  snapshot: string;
  state: string;
  indices?: string[];
  start_time?: string;
  duration_in_millis?: number;
  failures?: unknown[];
}

/**
 * Lists the snapshots of one repository, or of all repositories.
 *
 * @param connection - The live connection.
 * @param repo - The repository name; every repository when omitted.
 * @returns The snapshots sorted by repository and start time.
 */
export async function listSnapshots(
  connection: Connection,
  repo?: string,
): Promise<SnapshotInfo[]> {
  const repos =
    repo === undefined
      ? (await listRepositories(connection)).map((entry) => entry.name)
      : [repo];
  const groups = await Promise.all(
    repos.map((repository) => snapshotsOf(connection, repository)),
  );
  return groups
    .flat()
    .sort(
      (a, b) =>
        a.repository.localeCompare(b.repository) ||
        a.startTime.localeCompare(b.startTime),
    );
}

/**
 * Lists the snapshots of one repository.
 *
 * @param connection - The live connection.
 * @param repository - The repository name.
 * @returns The snapshots, in response order.
 */
async function snapshotsOf(
  connection: Connection,
  repository: string,
): Promise<SnapshotInfo[]> {
  const response = await connection.client.snapshot.get({
    repository,
    snapshot: '_all',
  });
  const body = response.body as { snapshots?: SnapshotEntry[] };
  return (body.snapshots ?? []).map((entry) => ({
    repository,
    name: entry.snapshot,
    state: entry.state,
    indices: entry.indices?.length ?? 0,
    startTime: entry.start_time ?? '',
    duration: formatMillis(entry.duration_in_millis ?? 0),
    failures: entry.failures?.length ?? 0,
  }));
}

/**
 * Reads one snapshot: state, indices, timing, and failures.
 *
 * @param connection - The live connection.
 * @param repo - The repository name.
 * @param name - The snapshot name.
 * @returns The snapshot document, or undefined when it does not exist.
 */
export async function getSnapshot(
  connection: Connection,
  repo: string,
  name: string,
): Promise<unknown> {
  try {
    const response = await connection.client.snapshot.get({
      repository: repo,
      snapshot: name,
    });
    const body = response.body as { snapshots?: unknown[] };
    return body.snapshots?.[0];
  } catch (error) {
    if (statusOf(error) === 404) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Formats a millisecond duration for the listing.
 *
 * @param millis - The duration in milliseconds.
 * @returns The duration, seconds below one minute, minutes above.
 */
function formatMillis(millis: number): string {
  const seconds = millis / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}
