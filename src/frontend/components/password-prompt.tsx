// The masked password prompt shown when a profile requires basic auth.

import { Box, Text } from 'ink';
import { TextPrompt } from 'inkstand';
import type { ReactElement } from 'react';

/** The password prompt contract. */
export interface PasswordPromptProps {
  /** The username the password belongs to. */
  username: string;
  /** The host being connected to. */
  host: string;
  /** Called with the password when the user presses enter. */
  onSubmit: (password: string) => void;
  /** Called when the user cancels with escape or ctrl+c. */
  onCancel: () => void;
}

/**
 * Renders a masked input asking for the profile password.
 *
 * @param props - The component props.
 * @returns The prompt element.
 */
export function PasswordPrompt(props: PasswordPromptProps): ReactElement {
  return (
    <Box
      borderColor="yellow"
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
    >
      <Text>
        Password for {props.username} @ {props.host} (esc or ctrl+c to cancel)
      </Text>
      <TextPrompt
        label="Password"
        mask="•"
        onCancel={props.onCancel}
        onSubmit={props.onSubmit}
      />
    </Box>
  );
}
