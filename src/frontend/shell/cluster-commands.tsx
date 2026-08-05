// The /cluster command runners.

import { Box, Text } from 'ink';
import type { ReactElement } from 'react';
import {
  type ClusterInfo,
  clusterInfo,
  describeFailure,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import type { CommandContext } from './command-types';
import { requireConnection } from './command-utils';

/**
 * Shows the cluster state: health, blocks, and disk usage.
 *
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export async function runClusterInfo(context: CommandContext): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const info = await clusterInfo(connection);
    context.session.push(<ClusterReport info={info} />);
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Renders the cluster report block.
 *
 * @param props - The component props.
 * @param props.info - The cluster information.
 * @returns The report element.
 */
function ClusterReport(props: { info: ClusterInfo }): ReactElement {
  const { info } = props;
  return (
    <Box flexDirection="column">
      <Text>
        {info.clusterName}: {info.status}, {info.nodes}{' '}
        {info.nodes === 1 ? 'node' : 'nodes'}, {info.unassignedShards}{' '}
        unassigned shards
      </Text>
      {info.blocks.length === 0 ? (
        <Text dimColor>No active blocks.</Text>
      ) : (
        info.blocks.map((block) => (
          <Text color="red" key={block}>
            ⚠ {block}
          </Text>
        ))
      )}
      {info.disk.map((node) => (
        <DiskLine key={node.node} node={node.node} percent={node.percent} />
      ))}
    </Box>
  );
}

/**
 * Renders the disk usage of one node, colored by pressure.
 *
 * @param props - The component props.
 * @param props.node - The node name.
 * @param props.percent - The used disk share, when known.
 * @returns The disk line element.
 */
function DiskLine(props: { node: string; percent?: number }): ReactElement {
  if (props.percent === undefined) {
    return <Text dimColor>{props.node}: disk usage unknown</Text>;
  }
  const color =
    props.percent >= 95 ? 'red' : props.percent >= 85 ? 'yellow' : undefined;
  return (
    <Text color={color}>
      {props.node}: {props.percent}% disk used
    </Text>
  );
}
