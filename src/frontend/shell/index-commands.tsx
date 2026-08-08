// The /index command runners.

import {
  type Connection,
  createIndex,
  describeFailure,
  type IndexInfo,
  listIndices,
  rollover,
} from '../../engine/engine';
import { Table, type TableProps, tableLines } from '../components/table';
import type { CommandContext } from './command-types';
import { requireConnection } from './command-utils';
import { pushFailure, pushLine } from './output';

/**
 * Lists the indices and renders them as a table block.
 *
 * @param context - What the command can act on.
 * @param pattern - An index name or pattern; all indices when omitted.
 * @returns Nothing.
 */
export async function runIndexLs(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const indices = await listIndices(connection, pattern);
    if (indices.length === 0) {
      pushLine(context.session, 'No indices match.', 'dim');
      return;
    }
    const table = indexTable(indices);
    context.session.push(<Table {...table} />, {
      label: 'the index list',
      text: tableLines(table).join('\n'),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Opens the deletion screen for the indices matching the pattern.
 *
 * @param context - What the command can act on.
 * @param pattern - An index name or pattern; all indices when omitted.
 * @returns Nothing.
 */
export async function runIndexRm(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const indices = await listIndices(connection, pattern);
    if (indices.length === 0) {
      pushLine(context.session, 'No indices match.', 'dim');
      return;
    }
    context.session.startRemove({ kind: 'index', targets: indices });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Creates an index and reports the outcome.
 *
 * @param context - What the command can act on.
 * @param name - The index name.
 * @returns Nothing.
 */
export async function runIndexCreate(
  context: CommandContext,
  name?: string,
  writeAlias?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  if (name === undefined) {
    pushLine(
      context.session,
      'Usage: /index create <name> [write-alias].',
      'yellow',
    );
    return;
  }
  if (!/-\d{6}$/.test(name)) {
    pushLine(
      context.session,
      'The name has no numeric suffix like -000001: rollover will not work.',
      'yellow',
    );
  }
  if (writeAlias === undefined) {
    context.session.startIndexEdit(name);
    return;
  }
  await createWithAlias(context, connection, name, writeAlias);
}

/**
 * Creates the index with its write alias and reports the outcome.
 *
 * @param context - What the command can act on.
 * @param connection - The live connection.
 * @param name - The index name.
 * @param writeAlias - The write alias to attach.
 * @returns Nothing.
 */
async function createWithAlias(
  context: CommandContext,
  connection: Connection,
  name: string,
  writeAlias: string,
): Promise<void> {
  try {
    await createIndex(connection, name, {
      aliases: { [writeAlias]: { is_write_index: true } },
    });
    pushLine(
      context.session,
      `✔ Index "${name}" created with write alias "${writeAlias}".`,
      'green',
    );
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Rolls over the alias, reapplying missing aliases, and reports the outcome.
 *
 * @param context - What the command can act on.
 * @param alias - The write alias to roll over.
 * @returns Nothing.
 */
export async function runIndexRollover(
  context: CommandContext,
  alias?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  if (alias === undefined) {
    pushLine(context.session, 'Usage: /index rollover <alias>.', 'yellow');
    return;
  }
  try {
    const result = await rollover(connection, alias);
    pushLine(
      context.session,
      `✔ Rolled over ${alias}: ${result.oldIndex} → ${result.newIndex}.`,
      'green',
    );
    if (result.reapplied.length === 0) {
      pushLine(context.session, 'No aliases to reapply.', 'dim');
    } else {
      pushLine(
        context.session,
        `Reapplied aliases: ${result.reapplied.join(', ')}.`,
      );
    }
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Builds the index listing table.
 *
 * @param indices - The indices to list.
 * @returns The table contract.
 */
function indexTable(indices: IndexInfo[]): TableProps {
  return {
    columns: [
      { label: 'index' },
      { label: 'health' },
      { label: 'docs', alignRight: true },
      { label: 'size', alignRight: true },
      { label: 'created' },
      { label: 'aliases (*: write)' },
    ],
    rows: indices.map((index) => [
      index.name,
      index.health,
      String(index.docsCount),
      index.storeSize,
      index.creationDate,
      index.aliases.join(', '),
    ]),
  };
}
