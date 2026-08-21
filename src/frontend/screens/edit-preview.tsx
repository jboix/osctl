// The edit preview: shows the pending change and asks for confirmation.

import { Box, Text, useInput } from 'ink';
import { type DiffLine, DiffView, Select } from 'inkstand';
import type { ReactElement } from 'react';

/** The edit preview contract. */
export interface EditPreviewProps {
  /** The confirmation question. */
  title: string;
  /** The preview lines: a diff, a summary, or the plain body. */
  lines: DiffLine[];
  /** Called when the user confirms. */
  onConfirm: () => void;
  /** Called when the user cancels. */
  onCancel: () => void;
}

/**
 * Renders the edit preview with a no/yes confirmation.
 *
 * @param props - The component props.
 * @returns The preview element.
 */
export function EditPreview(props: EditPreviewProps): ReactElement {
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
      <Box flexDirection="column" marginBottom={1}>
        <DiffView lines={props.lines} />
      </Box>
      <Select
        items={[
          { label: 'No, cancel', value: false },
          { label: 'Yes, apply', value: true },
        ]}
        onSelect={(confirmed) =>
          confirmed ? props.onConfirm() : props.onCancel()
        }
      />
    </Box>
  );
}
