// The /index command runners.

import { Text } from 'ink';
import type { ReactElement } from 'react';
import {
  createIndex,
  describeFailure,
  type IndexInfo,
  listIndices,
  rollover,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import { Table } from '../components/table';
import type { CommandContext } from './command-types';
import { requireConnection } from './command-utils';

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
    context.session.push(
      indices.length === 0 ? (
        <Text dimColor>No indices match.</Text>
      ) : (
        <IndexTable indices={indices} />
      ),
    );
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
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
      context.session.push(<Text dimColor>No indices match.</Text>);
      return;
    }
    context.session.startRemove({ kind: 'index', targets: indices });
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
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
    context.session.push(
      <Text color="yellow">
        Usage: /index create {'<name>'} [write-alias].
      </Text>,
    );
    return;
  }
  if (!/-\d{6}$/.test(name)) {
    context.session.push(
      <Text color="yellow">
        The name has no numeric suffix like -000001: rollover will not work.
      </Text>,
    );
  }
  if (writeAlias === undefined) {
    context.session.startIndexEdit(name);
    return;
  }
  try {
    await createIndex(connection, name, {
      aliases: { [writeAlias]: { is_write_index: true } },
    });
    context.session.push(
      <Text color="green">
        ✔ Index "{name}" created with write alias "{writeAlias}".
      </Text>,
    );
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
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
    context.session.push(
      <Text color="yellow">Usage: /index rollover {'<alias>'}.</Text>,
    );
    return;
  }
  try {
    const result = await rollover(connection, alias);
    context.session.push(
      <Text color="green">
        ✔ Rolled over {alias}: {result.oldIndex} → {result.newIndex}.
      </Text>,
    );
    context.session.push(
      result.reapplied.length === 0 ? (
        <Text dimColor>No aliases to reapply.</Text>
      ) : (
        <Text>Reapplied aliases: {result.reapplied.join(', ')}.</Text>
      ),
    );
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Renders the index listing as a table.
 *
 * @param props - The component props.
 * @param props.indices - The indices to list.
 * @returns The table element.
 */
function IndexTable(props: { indices: IndexInfo[] }): ReactElement {
  const columns = [
    { label: 'index' },
    { label: 'health' },
    { label: 'docs', alignRight: true },
    { label: 'size', alignRight: true },
    { label: 'created' },
    { label: 'aliases (*: write)' },
  ];
  const rows = props.indices.map((index) => [
    index.name,
    index.health,
    String(index.docsCount),
    index.storeSize,
    index.creationDate,
    index.aliases.join(', '),
  ]);
  return <Table columns={columns} rows={rows} />;
}
