// The status bar under the input box.

import { Text } from 'ink';
import { StatusBar as StatusBarView, type StatusSegment } from 'inkstand';
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
  return (
    <StatusBarView
      right={
        props.hint === undefined ? undefined : (
          <Text dimColor>{props.hint}</Text>
        )
      }
      segments={segments(props)}
    />
  );
}

/**
 * Builds the left segments from the status values.
 *
 * @param props - The status values.
 * @returns The segments, in display order.
 */
function segments(props: StatusBarProps): StatusSegment[] {
  const color = STATUS_COLORS[props.status ?? ''] ?? DEFAULT_STATUS_COLOR;
  const items: StatusSegment[] = [
    { text: `[${props.profileName ?? 'no profile'}]` },
    { text: '●', color },
  ];
  if (props.status !== undefined) {
    items.push({ text: props.status });
  }
  if (props.clusterName !== undefined) {
    items.push({ text: props.clusterName });
  }
  if (props.host !== undefined) {
    items.push({ text: props.host, dim: true });
  }
  return items;
}
