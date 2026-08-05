// The edit preview: shows the pending change and asks for confirmation.

import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { ReactElement } from 'react';
import type { DiffLine } from '../components/line-diff';

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

/** The color per diff sign. */
const COLORS = {
  '+': 'green',
  '-': 'red',
  '@': 'cyan',
  ' ': undefined,
} as const;

/**
 * Gives every line a stable key: its content plus its occurrence count.
 *
 * @param lines - The preview lines.
 * @returns The lines with their keys.
 */
function keyedLines(lines: DiffLine[]): (DiffLine & { key: string })[] {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const base = `${line.sign}${line.text}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return { ...line, key: `${base}#${count}` };
  });
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
        {keyedLines(props.lines).map((line) => (
          <Text color={COLORS[line.sign]} key={line.key}>
            {line.sign} {line.text}
          </Text>
        ))}
      </Box>
      <SelectInput
        items={[
          { label: 'No, cancel', value: 'no' },
          { label: 'Yes, apply', value: 'yes' },
        ]}
        onSelect={(item) =>
          item.value === 'yes' ? props.onConfirm() : props.onCancel()
        }
      />
    </Box>
  );
}
