// The /snapshot command runners.

import { Table, type TableProps, tableText } from 'inkstand';
import {
  describeFailure,
  getSnapshot,
  listRepositories,
  listSnapshots,
  type SnapshotInfo,
} from '../../engine/engine';
import { matchesPattern } from '../../utils/pattern';
import type { CommandContext } from './command-types';
import { requireConnection } from './command-utils';
import { pushFailure, pushLine, pushNotice } from './output';

/**
 * Lists the snapshot repositories as a table block.
 *
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export async function runSnapshotRepoLs(
  context: CommandContext,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const repositories = await listRepositories(connection);
    if (repositories.length === 0) {
      pushLine(context.session, 'No snapshot repositories.', 'dim');
      return;
    }
    const table: TableProps = {
      columns: [{ label: 'repository' }, { label: 'type' }],
      rows: repositories.map((repository) => [
        repository.name,
        repository.type,
      ]),
    };
    context.session.push(<Table {...table} />, {
      label: 'the repository list',
      text: tableText(table),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Lists the snapshots as a table block.
 *
 * @param context - What the command can act on.
 * @param repo - The repository name; every repository when omitted.
 * @returns Nothing.
 */
export async function runSnapshotLs(
  context: CommandContext,
  repo?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const snapshots = await listSnapshots(connection, repo);
    if (snapshots.length === 0) {
      pushLine(context.session, 'No snapshots.', 'dim');
      return;
    }
    const table = snapshotTable(snapshots);
    context.session.push(<Table {...table} />, {
      label: 'the snapshot list',
      text: tableText(table),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Builds the snapshot listing table.
 *
 * @param snapshots - The snapshots to list.
 * @returns The table contract.
 */
function snapshotTable(snapshots: SnapshotInfo[]): TableProps {
  return {
    columns: [
      { label: 'repository' },
      { label: 'snapshot' },
      { label: 'state' },
      { label: 'indices', alignRight: true },
      { label: 'started' },
      { label: 'duration', alignRight: true },
      { label: 'failures', alignRight: true },
    ],
    rows: snapshots.map((snapshot) => [
      snapshot.repository,
      snapshot.name,
      snapshot.state,
      String(snapshot.indices),
      snapshot.startTime,
      snapshot.duration,
      String(snapshot.failures),
    ]),
  };
}

/**
 * Prints one snapshot as a document block.
 *
 * @param context - What the command can act on.
 * @param repo - The repository name.
 * @param name - The snapshot name.
 * @returns Nothing.
 */
export async function runSnapshotShow(
  context: CommandContext,
  repo?: string,
  name?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  if (repo === undefined || name === undefined) {
    pushNotice(
      context.session,
      'warn',
      'Usage: "/snapshot show <repo> <name>".',
    );
    return;
  }
  try {
    const snapshot = await getSnapshot(connection, repo, name);
    if (snapshot === undefined) {
      pushNotice(context.session, 'warn', `No snapshot "${repo}/${name}".`);
      return;
    }
    context.session.showDoc(
      `snapshot "${repo}/${name}"`,
      JSON.stringify(snapshot, null, 2),
    );
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Opens the editor over the body of a new snapshot.
 *
 * @param context - What the command can act on.
 * @param repo - The repository name.
 * @param name - The snapshot name.
 * @returns Nothing.
 */
export function runSnapshotCreate(
  context: CommandContext,
  repo?: string,
  name?: string,
): void {
  if (requireConnection(context) === undefined) {
    return;
  }
  if (repo === undefined || name === undefined) {
    pushNotice(
      context.session,
      'warn',
      'Usage: "/snapshot create <repo> <name>".',
    );
    return;
  }
  context.session.startSnapshotCreate(repo, name);
}

/**
 * Opens the editor over the restore body of a snapshot.
 *
 * @param context - What the command can act on.
 * @param repo - The repository name.
 * @param name - The snapshot name.
 * @returns Nothing.
 */
export function runSnapshotRestore(
  context: CommandContext,
  repo?: string,
  name?: string,
): void {
  if (requireConnection(context) === undefined) {
    return;
  }
  if (repo === undefined || name === undefined) {
    pushNotice(
      context.session,
      'warn',
      'Usage: "/snapshot restore <repo> <name>".',
    );
    return;
  }
  context.session.startSnapshotRestore(repo, name);
}

/**
 * Opens the deletion screen for the snapshots matching the pattern.
 *
 * @param context - What the command can act on.
 * @param repo - The repository name.
 * @param pattern - A snapshot name or pattern; all snapshots when omitted.
 * @returns Nothing.
 */
export async function runSnapshotRm(
  context: CommandContext,
  repo?: string,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  if (repo === undefined) {
    pushNotice(
      context.session,
      'warn',
      'Usage: "/snapshot rm <repo> [pattern]".',
    );
    return;
  }
  try {
    const snapshots = (await listSnapshots(connection, repo)).filter(
      (snapshot) => matchesPattern(snapshot.name, pattern),
    );
    if (snapshots.length === 0) {
      pushLine(context.session, 'No snapshots match.', 'dim');
      return;
    }
    context.session.startRemove({
      kind: 'snapshot',
      repo,
      items: snapshots.map((snapshot) => ({
        label: `${snapshot.name.padEnd(28)} ${snapshot.state} (${snapshot.startTime})`,
        value: snapshot.name,
      })),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}
