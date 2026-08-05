// The /index rm screen: select the indices, review the plan, confirm.

import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { formatBytes, type IndexInfo } from '../../engine/engine';
import { MultiSelect } from '../components/multi-select';

/** The screen contract. */
export interface IndexRmScreenProps {
  /** The indices the pattern matched. */
  targets: IndexInfo[];
  /** Called with the confirmed index names. */
  onConfirm: (names: string[]) => void;
  /** Called when the user cancels with escape. */
  onCancel: () => void;
}

/**
 * Renders the deletion flow: multi-select first, then the confirmation.
 *
 * @param props - The component props.
 * @returns The screen element.
 */
export function IndexRmScreen(props: IndexRmScreenProps): ReactElement {
  const [chosen, setChosen] = useState<string[] | undefined>();
  useInput((input, key) => {
    if (key.escape || input === 'q' || (key.ctrl && input === 'c')) {
      props.onCancel();
    }
  });
  return (
    <Box
      borderColor="red"
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
    >
      <Text color="red">Delete indices (esc, q, or ctrl+c to cancel)</Text>
      {chosen === undefined ? (
        <Selection
          onCancel={props.onCancel}
          onChosen={setChosen}
          targets={props.targets}
        />
      ) : (
        <Confirmation
          chosen={chosen}
          onConfirm={props.onConfirm}
          onReject={props.onCancel}
          targets={props.targets}
        />
      )}
    </Box>
  );
}

/**
 * Renders the multi-select over the matched indices.
 *
 * @param props - The component props.
 * @param props.targets - The indices the pattern matched.
 * @param props.onChosen - Called with the selected names.
 * @param props.onCancel - Called when nothing is selected.
 * @returns The selection element.
 */
function Selection(props: {
  targets: IndexInfo[];
  onChosen: (names: string[]) => void;
  onCancel: () => void;
}): ReactElement {
  return (
    <MultiSelect
      items={props.targets.map((target) => ({
        label: targetLabel(target),
        value: target.name,
      }))}
      onSubmit={(names) =>
        names.length === 0 ? props.onCancel() : props.onChosen(names)
      }
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
 * Renders the confirmation: the totals, the write warning, and yes or no.
 *
 * @param props - The component props.
 * @param props.targets - The indices the pattern matched.
 * @param props.chosen - The selected index names.
 * @param props.onConfirm - Called with the names on yes.
 * @param props.onReject - Called on no.
 * @returns The confirmation element.
 */
function Confirmation(props: {
  targets: IndexInfo[];
  chosen: string[];
  onConfirm: (names: string[]) => void;
  onReject: () => void;
}): ReactElement {
  const selected = props.targets.filter((target) =>
    props.chosen.includes(target.name),
  );
  const bytes = selected.reduce((sum, target) => sum + target.storeBytes, 0);
  const writers = selected.filter((target) =>
    target.aliases.some((alias) => alias.endsWith('*')),
  );
  return (
    <Box flexDirection="column">
      <Text>
        Delete {selected.length} {selected.length === 1 ? 'index' : 'indices'} (
        {formatBytes(bytes)}): {props.chosen.join(', ')}
      </Text>
      {writers.length > 0 && (
        <Text color="red">
          ⚠ Includes write {writers.length === 1 ? 'index' : 'indices'}:{' '}
          {writers.map((target) => target.name).join(', ')}
        </Text>
      )}
      <SelectInput
        items={[
          { label: 'no', value: false },
          { label: 'yes, delete', value: true },
        ]}
        onSelect={(item) =>
          item.value ? props.onConfirm(props.chosen) : props.onReject()
        }
      />
    </Box>
  );
}
