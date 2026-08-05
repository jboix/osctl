// A profile picker: lists the saved profiles and returns the chosen one.

import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { ReactElement } from 'react';
import type { Profile } from '../../engine/engine';

/** The profile picker contract. */
export interface ProfileSelectProps {
  /** The box title. */
  title: string;
  /** The selectable profiles. */
  profiles: Profile[];
  /** The name marked as `(current)` in the list. */
  currentName?: string;
  /** Called with the chosen profile. */
  onPick: (profile: Profile) => void;
  /** Called when the user cancels with escape. */
  onCancel: () => void;
}

/**
 * Renders the profile picker.
 *
 * @param props - The component props.
 * @returns The picker element.
 */
export function ProfileSelect(props: ProfileSelectProps): ReactElement {
  useInput((input, key) => {
    if (key.escape || input === 'q' || (key.ctrl && input === 'c')) {
      props.onCancel();
    }
  });
  return (
    <Box
      borderColor="cyan"
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
    >
      <Text color="cyan">{props.title} (esc, q, or ctrl+c to cancel)</Text>
      {props.profiles.length === 0 ? (
        <Text color="yellow">No profiles saved. Run /profile add.</Text>
      ) : (
        <SelectInput
          items={toItems(props)}
          onSelect={(item) => pick(props, item.value)}
        />
      )}
    </Box>
  );
}

/**
 * Builds the select items from the profiles.
 *
 * @param props - The picker props.
 * @returns The select items, the profile name as value.
 */
function toItems(
  props: ProfileSelectProps,
): { label: string; value: string }[] {
  return props.profiles.map((profile) => ({
    label: [
      profile.name.padEnd(12),
      profile.host,
      profile.name === props.currentName ? ' (current)' : '',
    ].join(' '),
    value: profile.name,
  }));
}

/**
 * Resolves the picked name back to its profile and reports it.
 *
 * @param props - The picker props.
 * @param name - The picked profile name.
 * @returns Nothing.
 */
function pick(props: ProfileSelectProps, name: string): void {
  const profile = props.profiles.find((candidate) => candidate.name === name);
  if (profile !== undefined) {
    props.onPick(profile);
  }
}
