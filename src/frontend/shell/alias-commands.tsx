// The /alias command runners.

import { Box, Text } from 'ink';
import type { ReactElement } from 'react';
import {
  type AliasInfo,
  describeFailure,
  listAliases,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import type { CommandContext } from './command-types';
import { matchesPattern, requireConnection } from './command-utils';

/**
 * Shows the alias tree.
 *
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export async function runAliasLs(context: CommandContext): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const aliases = await listAliases(connection);
    context.session.push(
      aliases.length === 0 ? (
        <Text dimColor>No aliases.</Text>
      ) : (
        <AliasTree aliases={aliases} />
      ),
    );
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Opens the removal screen for the aliases matching the pattern.
 *
 * @param context - What the command can act on.
 * @param pattern - An alias name or pattern; all aliases when omitted.
 * @returns Nothing.
 */
export async function runAliasRm(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const aliases = (await listAliases(connection)).filter((alias) =>
      matchesPattern(alias.name, pattern),
    );
    if (aliases.length === 0) {
      context.session.push(<Text dimColor>No aliases match.</Text>);
      return;
    }
    context.session.startAliasRm(aliases);
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Renders the alias tree: each alias with the indices it points at.
 *
 * @param props - The component props.
 * @param props.aliases - The aliases to render.
 * @returns The tree element.
 */
function AliasTree(props: { aliases: AliasInfo[] }): ReactElement {
  return (
    <Box flexDirection="column">
      {props.aliases.map((alias) => (
        <Box flexDirection="column" key={alias.name}>
          <Text color="cyan">{alias.name}</Text>
          {alias.targets.map((target, index) => (
            <Text key={target.index}>
              {index === alias.targets.length - 1 ? '└─ ' : '├─ '}
              {target.index}
              {target.write && <Text color="green"> (write)</Text>}
              {target.filtered && <Text dimColor> filtered</Text>}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
}
