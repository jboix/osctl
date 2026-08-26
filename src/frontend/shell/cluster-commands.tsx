// The /cluster command runners.

import { Box, Text } from 'ink';
import { Table, type TableProps, tableText } from 'inkstand';
import type { ReactElement } from 'react';
import {
  type AllocationExplanation,
  type ClusterInfo,
  clusterInfo,
  clusterSettings,
  describeFailure,
  explainAllocation,
  listNodes,
  type NodeDecision,
  type NodeInfo,
} from '../../engine/engine';
import type { CommandContext } from './command-types';
import { requireConnection } from './command-utils';
import { pushFailure, pushLine } from './output';

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
    context.session.push(<ClusterReport info={info} />, {
      label: 'the cluster report',
      text: clusterReportText(info),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Shows the persistent and transient cluster settings as a document block.
 *
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export async function runClusterSettings(
  context: CommandContext,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const settings = await clusterSettings(connection);
    context.session.showDoc(
      'cluster settings',
      JSON.stringify(settings, null, 2),
    );
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Lists the nodes and renders them as a table block.
 *
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export async function runClusterNodes(context: CommandContext): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const table = nodeTable(await listNodes(connection));
    context.session.push(<Table {...table} />, {
      label: 'the node list',
      text: tableText(table),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Explains why the first unassigned shard is unassigned.
 *
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export async function runClusterExplain(
  context: CommandContext,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const explanation = await explainAllocation(connection);
    if (explanation === undefined) {
      pushLine(context.session, 'No unassigned shards to explain.', 'dim');
      return;
    }
    context.session.push(<AllocationReport explanation={explanation} />, {
      label: 'the allocation explanation',
      text: allocationReportText(explanation),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Builds the node listing table.
 *
 * @param nodes - The nodes to list.
 * @returns The table contract.
 */
function nodeTable(nodes: NodeInfo[]): TableProps {
  return {
    columns: [
      { label: 'name (*: cluster manager)' },
      { label: 'roles' },
      { label: 'version' },
      { label: 'heap', alignRight: true },
      { label: 'cpu', alignRight: true },
      { label: 'load 1m/5m/15m', alignRight: true },
    ],
    rows: nodes.map((node) => [
      node.manager ? `${node.name}*` : node.name,
      node.roles,
      node.version,
      percentCell(node.heapPercent),
      percentCell(node.cpu),
      [node.load1m, node.load5m, node.load15m]
        .map((load) => load ?? '?')
        .join(' '),
    ]),
  };
}

/**
 * Formats a percentage cell.
 *
 * @param percent - The percentage, when known.
 * @returns The cell text, `?` when unknown.
 */
function percentCell(percent?: number): string {
  return percent === undefined ? '?' : `${percent}%`;
}

/**
 * Formats the shard heading of an allocation explanation.
 *
 * @param explanation - The allocation explanation.
 * @returns The heading: index, shard, role, state, and unassignment reason.
 */
function allocationHeading(explanation: AllocationExplanation): string {
  const role = explanation.primary ? 'primary' : 'replica';
  const reason =
    explanation.unassignedReason === undefined
      ? ''
      : ` (${explanation.unassignedReason})`;
  return `${explanation.index} [${explanation.shard}] ${role}: ${explanation.currentState}${reason}`;
}

/**
 * Formats the allocation explanation as the plain text the block renders.
 *
 * @param explanation - The allocation explanation.
 * @returns The report text.
 */
function allocationReportText(explanation: AllocationExplanation): string {
  const lines = [
    allocationHeading(explanation),
    ...(explanation.explanation === undefined ? [] : [explanation.explanation]),
    ...explanation.decisions.flatMap((decision) => [
      `${decision.node}: ${decision.decision}`,
      ...decision.reasons.map((reason) => `  ${reason}`),
    ]),
  ];
  return lines.join('\n');
}

/**
 * Renders the allocation explanation block.
 *
 * @param props - The component props.
 * @param props.explanation - The allocation explanation.
 * @returns The report element.
 */
function AllocationReport(props: {
  explanation: AllocationExplanation;
}): ReactElement {
  const { explanation } = props;
  return (
    <Box flexDirection="column">
      <Text>{allocationHeading(explanation)}</Text>
      {explanation.explanation === undefined ? null : (
        <Text color="yellow">{explanation.explanation}</Text>
      )}
      {explanation.decisions.map((decision) => (
        <DecisionLines decision={decision} key={decision.node} />
      ))}
    </Box>
  );
}

/**
 * Renders the decision of one node with its decider explanations.
 *
 * @param props - The component props.
 * @param props.decision - The node decision.
 * @returns The decision element.
 */
function DecisionLines(props: { decision: NodeDecision }): ReactElement {
  const { decision } = props;
  return (
    <Box flexDirection="column">
      <Text color={decision.decision === 'yes' ? 'green' : 'red'}>
        {decision.node}: {decision.decision}
      </Text>
      {decision.reasons.map((reason) => (
        <Text dimColor key={reason}>
          {'  '}
          {reason}
        </Text>
      ))}
    </Box>
  );
}

/**
 * Formats the cluster report as the plain text the block renders.
 *
 * @param info - The cluster information.
 * @returns The report text.
 */
function clusterReportText(info: ClusterInfo): string {
  const lines = [
    `${info.clusterName}: ${info.status}, ${info.nodes} ${
      info.nodes === 1 ? 'node' : 'nodes'
    }, ${info.unassignedShards} unassigned shards`,
    ...(info.blocks.length === 0
      ? ['No active blocks.']
      : info.blocks.map((block) => `⚠ ${block}`)),
    ...info.disk.map((node) =>
      node.percent === undefined
        ? `${node.node}: disk usage unknown`
        : `${node.node}: ${node.percent}% disk used`,
    ),
  ];
  return lines.join('\n');
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
