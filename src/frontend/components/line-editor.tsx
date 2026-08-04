// The command input line: the value and a block caret.

import { Text } from 'ink';
import type { ReactElement } from 'react';

/**
 * Renders the line with the caret at the given position.
 *
 * @param props - The component props.
 * @param props.value - The current line.
 * @param props.cursor - The caret position, 0 to value.length.
 * @returns The line element.
 */
export function LineEditorView(props: {
  value: string;
  cursor: number;
}): ReactElement {
  const at = props.value[props.cursor] ?? ' ';
  return (
    <Text>
      {props.value.slice(0, props.cursor)}
      <Text inverse>{at}</Text>
      {props.value.slice(props.cursor + 1)}
    </Text>
  );
}
