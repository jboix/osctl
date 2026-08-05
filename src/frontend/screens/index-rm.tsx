// The /index rm flavor of the removal screen: sizes and write warnings.

import { Box, Text } from 'ink';
import type { ReactElement, ReactNode } from 'react';
import { formatBytes, type IndexInfo } from '../../engine/engine';
import { RemoveScreen } from './remove';

/** The screen contract. */
export interface IndexRmScreenProps {
  /** The indices the pattern matched. */
  targets: IndexInfo[];
  /** Called with the confirmed index names. */
  onConfirm: (names: string[]) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
}

/**
 * Renders the index removal flow.
 *
 * @param props - The component props.
 * @returns The screen element.
 */
export function IndexRmScreen(props: IndexRmScreenProps): ReactElement {
  return (
    <RemoveScreen
      confirmation={(chosen) => summary(props.targets, chosen)}
      items={props.targets.map((target) => ({
        label: targetLabel(target),
        value: target.name,
      }))}
      onCancel={props.onCancel}
      onConfirm={props.onConfirm}
      title="Delete indices"
    />
  );
}

/**
 * Formats one selectable index row.
 *
 * @param target - The index.
 * @returns The row label.
 */
function targetLabel(target: IndexInfo): string {
  const write = target.aliases.some((alias) => alias.endsWith('*'));
  return [
    target.name.padEnd(24),
    target.storeSize.padStart(9),
    `${target.docsCount} docs`,
    write ? '(write)' : '',
  ]
    .join('  ')
    .trimEnd();
}

/**
 * Builds the confirmation summary: totals and the write warning.
 *
 * @param targets - The indices the pattern matched.
 * @param chosen - The selected index names.
 * @returns The summary element.
 */
function summary(targets: IndexInfo[], chosen: string[]): ReactNode {
  const selected = targets.filter((target) => chosen.includes(target.name));
  const bytes = selected.reduce((sum, target) => sum + target.storeBytes, 0);
  const writers = selected.filter((target) =>
    target.aliases.some((alias) => alias.endsWith('*')),
  );
  return (
    <Box flexDirection="column">
      <Text>
        Delete {selected.length} {selected.length === 1 ? 'index' : 'indices'} (
        {formatBytes(bytes)}): {chosen.join(', ')}
      </Text>
      {writers.length > 0 && (
        <Text color="red">
          ⚠ Includes write {writers.length === 1 ? 'index' : 'indices'}:{' '}
          {writers.map((target) => target.name).join(', ')}
        </Text>
      )}
    </Box>
  );
}
