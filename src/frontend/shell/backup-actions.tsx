// The /backup flows: show a backup, open the restore preview, run the picker.

import { type DiffLine, diffLines } from 'inkstand';
import {
  type BackupInfo,
  BackupStore,
  type Connection,
  describeFailure,
} from '../../engine/engine';
import { readableStamp } from '../../utils/time';
import { pushFailure, pushLine } from './output';
import { currentDocument } from './pick-kinds';
import type {
  EditPreviewState,
  SessionActions,
  SessionDeps,
} from './session-types';

/** The actions of the backup flows. */
type BackupActions = Pick<
  SessionActions,
  | 'showBackup'
  | 'applyBackup'
  | 'openBackupPick'
  | 'pickBackup'
  | 'cancelBackupPick'
>;

/** What names the profile whose backups are managed. */
interface ProfileSource {
  /** The live connection, when there is one. */
  connection?: Connection;
  /** The status bar values; the profile name survives a lost connection. */
  status: { profileName?: string };
}

/**
 * Builds the backup store of the session profile.
 *
 * @param source - The connection and the status bar values.
 * @returns The store, or undefined when no profile is selected.
 */
export function backupStore(source: ProfileSource): BackupStore | undefined {
  const profile = source.connection?.profile.name ?? source.status.profileName;
  return profile === undefined ? undefined : new BackupStore(profile);
}

/**
 * Formats a backup as a picker or removal label.
 *
 * @param backup - The backup to label.
 * @returns The label: type, name, and save time.
 */
export function backupLabel(backup: BackupInfo): string {
  return `${backup.type.padEnd(8)} ${backup.name.padEnd(28)} ${readableStamp(backup.stamp)}`;
}

/**
 * Builds the backup flow actions.
 *
 * @param deps - The session state setters and the navigation.
 * @returns The backup flow actions.
 */
export function createBackupActions(deps: SessionDeps): BackupActions {
  return {
    showBackup: (backup): void => showBackup(backup, deps),
    applyBackup: (backup): void => {
      void applyBackup(backup, deps);
    },
    openBackupPick: (action, entries): void => {
      deps.setBackupPick({ action, entries });
      deps.navigate('/backup/pick');
    },
    pickBackup: (id): void => dispatchPick(id, deps),
    cancelBackupPick: (): void => closePick(deps),
  };
}

/**
 * Clears the picker state and returns to the prompt.
 *
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function closePick(deps: SessionDeps): void {
  deps.setBackupPick(undefined);
  deps.navigate('/');
}

/**
 * Routes a picked backup to the action of the open picker.
 *
 * @param id - The picked backup identifier.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function dispatchPick(id: string, deps: SessionDeps): void {
  const pick = deps.backupPick;
  closePick(deps);
  const backup = pick?.entries.find((entry) => entry.id === id);
  if (pick === undefined || backup === undefined) {
    return;
  }
  if (pick.action === 'show') {
    showBackup(backup, deps);
  } else {
    void applyBackup(backup, deps);
  }
}

/**
 * Shows a backup as the document block.
 *
 * @param backup - The backup to show.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function showBackup(backup: BackupInfo, deps: SessionDeps): void {
  const body = backupStore(deps)?.read(backup.id);
  if (body === undefined) {
    pushLine(deps, `Backup not found: ${backup.id}.`, 'yellow');
    return;
  }
  deps.showDoc(
    `backup ${backup.type} "${backup.name}" (${readableStamp(backup.stamp)})`,
    body,
  );
}

/** The hint per backup type that cannot be restored directly. */
const REFERENCE_ONLY: Record<'alias' | 'cluster' | 'settings', string> = {
  alias:
    'Alias snapshots are reference only. Use /backup show and /alias apply.',
  cluster:
    'Cluster settings backups are reference only. Use /backup show and /cluster settings apply.',
  settings:
    'Index settings backups are reference only. Use /backup show and /index settings apply.',
};

/**
 * Opens the restore preview: the backup body diffed against the live
 * document. Confirming applies through the standard edit flow, which backs
 * up the document being replaced.
 *
 * @param backup - The backup to restore.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function applyBackup(
  backup: BackupInfo,
  deps: SessionDeps,
): Promise<void> {
  const connection = deps.connection;
  if (connection === undefined) {
    pushLine(deps, 'Not connected. Run /profile add.', 'yellow');
    return;
  }
  if (
    backup.type !== 'template' &&
    backup.type !== 'component' &&
    backup.type !== 'policy'
  ) {
    pushLine(deps, REFERENCE_ONLY[backup.type], 'yellow');
    return;
  }
  const body = backupStore(deps)?.read(backup.id);
  if (body === undefined) {
    pushLine(deps, `Backup not found: ${backup.id}.`, 'yellow');
    return;
  }
  try {
    const live = await currentDocument(backup.type, backup.name, connection);
    const base = live === undefined ? undefined : JSON.stringify(live, null, 2);
    deps.setEditPreview(restorePreview(backup.type, backup, body, base));
    deps.navigate('/edit/preview');
  } catch (error) {
    pushFailure(deps, describeFailure(error));
  }
}

/**
 * Builds the restore preview of a backup.
 *
 * @param type - The restorable resource kind.
 * @param backup - The backup being restored.
 * @param body - The backup body.
 * @param base - The live document body, when the document still exists.
 * @returns The preview the /edit/preview screen confirms.
 */
function restorePreview(
  type: 'template' | 'component' | 'policy',
  backup: BackupInfo,
  body: string,
  base: string | undefined,
): EditPreviewState {
  return {
    kind: type,
    name: backup.name,
    payload: JSON.parse(body),
    title: `Restore ${type} "${backup.name}" from ${readableStamp(backup.stamp)}?`,
    lines: restoreLines(base, body),
    backup:
      base === undefined ? undefined : { type, name: backup.name, body: base },
  };
}

/**
 * Renders the restore preview lines.
 *
 * @param base - The live document body, when the document still exists.
 * @param body - The backup body.
 * @returns A diff against the live document, or the plain body.
 */
function restoreLines(base: string | undefined, body: string): DiffLine[] {
  if (base === undefined) {
    return body.split('\n').map((text) => ({ sign: '+', text }));
  }
  const diff = diffLines(base, body);
  return diff.length === 0 ? [{ sign: ' ', text: '(no changes)' }] : diff;
}
