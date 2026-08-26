// A document picker: choose an existing name or enter a new one.

import { useInput } from 'ink';
import { Pane, Select, TextPrompt } from 'inkstand';
import { type ReactElement, useState } from 'react';

/** The list value of the new document entry. Names cannot contain it. */
const NEW_VALUE = ' new';

/** The document picker contract. */
export interface DocPickProps {
  /** The box title. */
  title: string;
  /** The resource noun, shown on the new entry, for example `template`. */
  noun: string;
  /** The existing document names. */
  names: string[];
  /** Whether the list offers the new document entry. */
  allowNew: boolean;
  /** Called with the chosen or newly entered name. */
  onPick: (name: string, isNew: boolean) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
}

/**
 * Renders the document picker. Selecting the new entry asks for a name.
 *
 * @param props - The component props.
 * @returns The picker element.
 */
export function DocPick(props: DocPickProps): ReactElement {
  const [naming, setNaming] = useState(false);
  useInput((input, key) => {
    if (
      key.escape ||
      (key.ctrl && input === 'c') ||
      (!naming && input === 'q')
    ) {
      props.onCancel();
    }
  });
  return (
    <Pane detail="esc or ctrl+c to cancel" focused title={props.title}>
      {naming ? (
        <NameEntry {...props} />
      ) : (
        <NameSelect {...props} onNew={() => setNaming(true)} />
      )}
    </Pane>
  );
}

/**
 * Renders the name input of a new document.
 *
 * @param props - The picker props.
 * @returns The name entry element.
 */
function NameEntry(props: DocPickProps): ReactElement {
  return (
    <TextPrompt
      label={`New ${props.noun} name`}
      onCancel={props.onCancel}
      onSubmit={(name) => submitName(props, name)}
    />
  );
}

/**
 * Renders the list of existing names, plus the new entry.
 *
 * @param props - The picker props, plus the new entry callback.
 * @returns The select element.
 */
function NameSelect(props: DocPickProps & { onNew: () => void }): ReactElement {
  return (
    <Select
      items={toItems(props)}
      onSelect={(value) =>
        value === NEW_VALUE ? props.onNew() : props.onPick(value, false)
      }
    />
  );
}

/**
 * Builds the select items: the existing names, then the optional new entry.
 *
 * @param props - The picker props.
 * @returns The select items.
 */
function toItems(props: DocPickProps): { label: string; value: string }[] {
  const names = props.names.map((name) => ({ label: name, value: name }));
  if (!props.allowNew) {
    return names;
  }
  return [...names, { label: `new ${props.noun}…`, value: NEW_VALUE }];
}

/**
 * Reports the entered name when it is not blank.
 *
 * @param props - The picker props.
 * @param name - The entered name.
 * @returns Nothing.
 */
function submitName(props: DocPickProps, name: string): void {
  const trimmed = name.trim();
  if (trimmed !== '') {
    props.onPick(trimmed, true);
  }
}
