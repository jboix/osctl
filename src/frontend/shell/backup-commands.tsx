// The /backup command runners.

import type { BackupInfo, BackupStore } from '../../engine/engine';
import { matchesPattern } from '../../utils/pattern';
import { readableStamp } from '../../utils/time';
import { Table, type TableProps, tableLines } from '../components/table';
import { backupLabel, backupStore } from './backup-actions';
import type { CommandContext } from './command-types';
import { requireConnection } from './command-utils';
import { pushLine } from './output';

/**
 * Returns the backup store of the session profile, reporting when there is
 * none.
 *
 * @param context - What the command can act on.
 * @returns The store, or undefined after reporting.
 */
function requireStore(context: CommandContext): BackupStore | undefined {
  const store = backupStore(context.session);
  if (store === undefined) {
    pushLine(
      context.session,
      'No profile selected. Run /profile add.',
      'yellow',
    );
  }
  return store;
}

/**
 * Lists the backups of the profile as a table block.
 *
 * @param context - What the command can act on.
 * @param pattern - A document name or pattern; all backups when omitted.
 * @returns Nothing.
 */
export function runBackupLs(context: CommandContext, pattern?: string): void {
  const store = requireStore(context);
  if (store === undefined) {
    return;
  }
  const backups = store
    .list()
    .filter((backup) => matchesPattern(backup.name, pattern));
  if (backups.length === 0) {
    pushLine(context.session, 'No backups match.', 'dim');
    return;
  }
  const table: TableProps = {
    columns: [{ label: 'type' }, { label: 'name' }, { label: 'saved' }],
    rows: backups.map((backup) => [
      backup.type,
      backup.name,
      readableStamp(backup.stamp),
    ]),
  };
  context.session.push(<Table {...table} />, {
    label: 'the backup list',
    text: tableLines(table).join('\n'),
  });
}

/**
 * Shows a backup, from a picker when the name does not settle it.
 *
 * @param context - What the command can act on.
 * @param name - A document name or pattern; all backups when omitted.
 * @returns Nothing.
 */
export function runBackupShow(context: CommandContext, name?: string): void {
  const store = requireStore(context);
  if (store === undefined) {
    return;
  }
  const backups = store
    .list()
    .filter((backup) => matchesPattern(backup.name, name));
  act(context, backups, 'show');
}

/**
 * Restores a backup, from a picker when the name does not settle it.
 *
 * @param context - What the command can act on.
 * @param name - A document name or pattern; all backups when omitted.
 * @returns Nothing.
 */
export function runBackupApply(context: CommandContext, name?: string): void {
  if (requireConnection(context) === undefined) {
    return;
  }
  const store = requireStore(context);
  if (store === undefined) {
    return;
  }
  const backups = store
    .list()
    .filter(
      (backup) => backup.type !== 'alias' && matchesPattern(backup.name, name),
    );
  act(context, backups, 'apply');
}

/**
 * Acts on the matched backups: directly on a single match, through the
 * picker otherwise.
 *
 * @param context - What the command can act on.
 * @param backups - The matched backups.
 * @param action - What to do with the backup.
 * @returns Nothing.
 */
function act(
  context: CommandContext,
  backups: BackupInfo[],
  action: 'show' | 'apply',
): void {
  const [first] = backups;
  if (first === undefined) {
    pushLine(context.session, 'No backups match.', 'dim');
    return;
  }
  if (backups.length === 1) {
    if (action === 'show') {
      context.session.showBackup(first);
    } else {
      context.session.applyBackup(first);
    }
    return;
  }
  context.session.openBackupPick(action, backups);
}

/**
 * Opens the deletion screen for the backups matching the pattern.
 *
 * @param context - What the command can act on.
 * @param pattern - A document name or pattern; all backups when omitted.
 * @returns Nothing.
 */
export function runBackupRm(context: CommandContext, pattern?: string): void {
  const store = requireStore(context);
  if (store === undefined) {
    return;
  }
  const backups = store
    .list()
    .filter((backup) => matchesPattern(backup.name, pattern));
  if (backups.length === 0) {
    pushLine(context.session, 'No backups match.', 'dim');
    return;
  }
  context.session.startRemove({
    kind: 'backup',
    items: backups.map((backup) => ({
      label: backupLabel(backup),
      value: backup.id,
    })),
  });
}
