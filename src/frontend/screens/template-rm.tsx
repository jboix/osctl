// The /template rm screen: select the templates, review, confirm.

import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { ReactElement } from 'react';
import { useState } from 'react';
import type { TemplateInfo } from '../../engine/engine';
import { MultiSelect } from '../components/multi-select';

/** The screen contract. */
export interface TemplateRmScreenProps {
  /** The templates the pattern matched. */
  targets: TemplateInfo[];
  /** Called with the confirmed template names. */
  onConfirm: (names: string[]) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
}

/**
 * Renders the deletion flow: multi-select first, then the confirmation.
 *
 * @param props - The component props.
 * @returns The screen element.
 */
export function TemplateRmScreen(props: TemplateRmScreenProps): ReactElement {
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
      <Text color="red">Delete templates (esc, q, or ctrl+c to cancel)</Text>
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
        />
      )}
    </Box>
  );
}

/**
 * Renders the multi-select over the matched templates.
 *
 * @param props - The component props.
 * @param props.targets - The templates the pattern matched.
 * @param props.onChosen - Called with the selected names.
 * @param props.onCancel - Called when nothing is selected.
 * @returns The selection element.
 */
function Selection(props: {
  targets: TemplateInfo[];
  onChosen: (names: string[]) => void;
  onCancel: () => void;
}): ReactElement {
  return (
    <MultiSelect
      items={props.targets.map((template) => ({
        label: `${template.name.padEnd(28)} ${template.patterns.join(', ')}`,
        value: template.name,
      }))}
      onSubmit={(names) =>
        names.length === 0 ? props.onCancel() : props.onChosen(names)
      }
    />
  );
}

/**
 * Renders the confirmation: the template names and yes or no.
 *
 * @param props - The component props.
 * @param props.chosen - The selected template names.
 * @param props.onConfirm - Called with the names on yes.
 * @param props.onReject - Called on no.
 * @returns The confirmation element.
 */
function Confirmation(props: {
  chosen: string[];
  onConfirm: (names: string[]) => void;
  onReject: () => void;
}): ReactElement {
  return (
    <Box flexDirection="column">
      <Text>
        Delete {props.chosen.length}{' '}
        {props.chosen.length === 1 ? 'template' : 'templates'}:{' '}
        {props.chosen.join(', ')}
      </Text>
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
