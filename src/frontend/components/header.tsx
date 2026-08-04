// The startup banner.

import { Box, Text } from 'ink';
import type { ReactElement } from 'react';

const LOGO = [
  ' ██████╗ ███████╗ ██████╗████████╗██╗     ',
  '██╔═══██╗██╔════╝██╔════╝╚══██╔══╝██║     ',
  '██║   ██║███████╗██║        ██║   ██║     ',
  '██║   ██║╚════██║██║        ██║   ██║     ',
  '╚██████╔╝███████║╚██████╗   ██║   ███████╗',
  ' ╚═════╝ ╚══════╝ ╚═════╝   ╚═╝   ╚══════╝',
];

/**
 * Renders the startup banner: the logo and the version line.
 *
 * @param props - The component props.
 * @param props.version - The version shown under the logo.
 * @returns The banner element.
 */
export function Header(props: { version: string }): ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1} marginTop={1}>
      {LOGO.map((line) => (
        <Text color="cyan" key={line}>
          {line}
        </Text>
      ))}
      <Text dimColor>Opensearch Control v{props.version}</Text>
    </Box>
  );
}
