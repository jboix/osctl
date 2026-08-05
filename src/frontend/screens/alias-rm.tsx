// The /alias rm screen: select the aliases, review the plan, confirm.

import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { ReactElement } from 'react';
import { useState } from 'react';
import type { AliasInfo } from '../../engine/engine';
import { MultiSelect } from '../components/multi-select';

/** The screen contract. */
export interface AliasRmScreenProps {
  /** The aliases the pattern matched. */
  targets: AliasInfo[];
  /** Called with the confirmed alias names. */
  onConfirm: (names: string[]) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
}

/**
 * Renders the removal flow: multi-select first, then the confirmation.
 *
 * @param props - The component props.
 * @returns The screen element.
 */
export function AliasRmScreen(props: AliasRmScreenProps): ReactElement {
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
      <Text color="red">Remove aliases (esc, q, or ctrl+c to cancel)</Text>
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
 * Renders the multi-select over the matched aliases.
 *
 * @param props - The component props.
 * @param props.targets - The aliases the pattern matched.
 * @param props.onChosen - Called with the selected names.
 * @param props.onCancel - Called when nothing is selected.
 * @returns The selection element.
 */
function Selection(props: {
  targets: AliasInfo[];
  onChosen: (names: string[]) => void;
  onCancel: () => void;
}): ReactElement {
  return (
    <MultiSelect
      items={props.targets.map((alias) => ({
        label: `${alias.name.padEnd(20)} ${alias.targets.length} ${
          alias.targets.length === 1 ? 'index' : 'indices'
        }`,
        value: alias.name,
      }))}
      onSubmit={(names) =>
        names.length === 0 ? props.onCancel() : props.onChosen(names)
      }
    />
  );
}

/**
 * Renders the confirmation: the affected indices and yes or no.
 *
 * @param props - The component props.
 * @param props.targets - The aliases the pattern matched.
 * @param props.chosen - The selected alias names.
 * @param props.onConfirm - Called with the names on yes.
 * @param props.onReject - Called on no.
 * @returns The confirmation element.
 */
function Confirmation(props: {
  targets: AliasInfo[];
  chosen: string[];
  onConfirm: (names: string[]) => void;
  onReject: () => void;
}): ReactElement {
  const affected = new Set(
    props.targets
      .filter((alias) => props.chosen.includes(alias.name))
      .flatMap((alias) => alias.targets.map((target) => target.index)),
  );
  return (
    <Box flexDirection="column">
      <Text>
        Remove {props.chosen.join(', ')} from {affected.size}{' '}
        {affected.size === 1 ? 'index' : 'indices'}:{' '}
        {[...affected].sort().join(', ')}
      </Text>
      <SelectInput
        items={[
          { label: 'no', value: false },
          { label: 'yes, remove', value: true },
        ]}
        onSelect={(item) =>
          item.value ? props.onConfirm(props.chosen) : props.onReject()
        }
      />
    </Box>
  );
}
