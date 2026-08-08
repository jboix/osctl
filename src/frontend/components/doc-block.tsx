// A shown document: a summary line over a folded or expanded body.

import { Box, Text } from 'ink';
import { createContext, type ReactElement, useContext } from 'react';

/** The lines a folded document shows before the fold marker. */
const PREVIEW_LINES = 10;

/** Whether every document block renders expanded. Toggled by ctrl+o. */
export const DocFoldContext = createContext(false);

/**
 * Renders a document block. Documents longer than the preview render their
 * first lines and a fold marker; ctrl+o expands them through the context.
 *
 * @param props - The component props.
 * @param props.title - The block title, like `template "logs"`.
 * @param props.text - The document body, pretty printed.
 * @returns The document block element.
 */
export function DocBlock(props: { title: string; text: string }): ReactElement {
  const expanded = useContext(DocFoldContext);
  const lines = props.text.split('\n');
  const folded = !expanded && lines.length > PREVIEW_LINES;
  const hidden = lines.length - PREVIEW_LINES;
  return (
    <Box flexDirection="column">
      <Text dimColor>{headerLine(props.title, lines.length, folded)}</Text>
      <Text>{(folded ? lines.slice(0, PREVIEW_LINES) : lines).join('\n')}</Text>
      {folded && (
        <Text dimColor>
          … {hidden} more {hidden === 1 ? 'line' : 'lines'} (ctrl+o expands)
        </Text>
      )}
    </Box>
  );
}

/**
 * Builds the summary line of a document block.
 *
 * @param title - The block title.
 * @param count - The document line count.
 * @param folded - Whether the body is cut at the preview.
 * @returns The summary line.
 */
function headerLine(title: string, count: number, folded: boolean): string {
  const arrow = folded ? '▸' : '▾';
  const hint = !folded && count > PREVIEW_LINES ? ', ctrl+o folds' : '';
  return `${arrow} ${title} (${count} ${count === 1 ? 'line' : 'lines'}${hint})`;
}
