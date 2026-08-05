// The removal skeleton: select the rows, review the plan, confirm.

import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { MultiSelect } from '../components/multi-select';

/** The removal screen contract. */
export interface RemoveScreenProps {
  /** The box title, for example `Delete indices`. */
  title: string;
  /** The selectable rows: a display label and the unique name. */
  items: { label: string; value: string }[];
  /** Renders the confirmation summary for the chosen names. */
  confirmation: (chosen: string[]) => ReactNode;
  /** Called with the confirmed names. */
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
export function RemoveScreen(props: RemoveScreenProps): ReactElement {
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
      <Text color="red">{props.title} (esc, q, or ctrl+c to cancel)</Text>
      {chosen === undefined ? (
        <MultiSelect
          items={props.items}
          onSubmit={(names) =>
            names.length === 0 ? props.onCancel() : setChosen(names)
          }
        />
      ) : (
        <Confirm chosen={chosen} {...props} />
      )}
    </Box>
  );
}

/**
 * Renders the confirmation summary and the yes or no choice.
 *
 * @param props - The screen props with the chosen names.
 * @param props.chosen - The selected names.
 * @returns The confirmation element.
 */
function Confirm(
  props: RemoveScreenProps & { chosen: string[] },
): ReactElement {
  return (
    <Box flexDirection="column">
      {props.confirmation(props.chosen)}
      <SelectInput
        items={[
          { label: 'no', value: false },
          { label: 'yes, delete', value: true },
        ]}
        onSelect={(item) =>
          item.value ? props.onConfirm(props.chosen) : props.onCancel()
        }
      />
    </Box>
  );
}
