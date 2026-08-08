// The status bar under the input box.

import { Box, Text } from 'ink';
import type { ReactElement } from 'react';

/** The values the status bar displays. */
export interface StatusBarProps {
  /** The active profile name. */
  profileName?: string;
  /** The connected host. */
  host?: string;
  /** The cluster name reported by the cluster. */
  clusterName?: string;
  /** The health status reported by the cluster. */
  status?: string;
  /** A hint shown at the right edge when set. */
  hint?: string;
}

const STATUS_COLORS: Record<string, string> = {
  green: 'green',
  red: 'red',
  yellow: 'yellow',
};

/** The dot color when the cluster status is unknown or not a known value. */
const DEFAULT_STATUS_COLOR = 'gray';

/**
 * Renders the status line: profile, health, cluster name, and host on the
 * left, the hint pushed to the right edge.
 *
 * @param props - The component props.
 * @returns The status bar element.
 */
export function StatusBar(props: StatusBarProps): ReactElement {
  const color = STATUS_COLORS[props.status ?? ''] ?? DEFAULT_STATUS_COLOR;
  return (
    <Box gap={2} justifyContent="space-between" paddingX={1}>
      <Box gap={1}>
        <Text>[{props.profileName ?? 'no profile'}]</Text>
        <Text color={color}>●</Text>
        {props.status !== undefined && <Text>{props.status}</Text>}
        {props.clusterName !== undefined && <Text>{props.clusterName}</Text>}
        {props.host !== undefined && <Text dimColor>{props.host}</Text>}
      </Box>
      {props.hint !== undefined && (
        <Box flexShrink={0}>
          <Text dimColor>{props.hint}</Text>
        </Box>
      )}
    </Box>
  );
}
