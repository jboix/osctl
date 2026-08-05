// A failed request: the lead message and the raw response under it.

import { Box, Text } from 'ink';
import type { ReactElement } from 'react';

/**
 * Renders the failure message with the pretty printed response below it.
 *
 * @param props - The component props.
 * @param props.message - One sentence describing what happened.
 * @param props.details - The response body, pretty printed.
 * @returns The failure element.
 */
export function FailureBlock(props: {
  message: string;
  details?: string;
}): ReactElement {
  return (
    <Box flexDirection="column">
      <Text color="red">✖ {props.message}</Text>
      {props.details !== undefined && <Text dimColor>{props.details}</Text>}
    </Box>
  );
}
