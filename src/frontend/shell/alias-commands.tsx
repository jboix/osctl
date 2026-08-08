// The /alias command runners.

import { Box, Text } from 'ink';
import type { ReactElement } from 'react';
import {
  type AliasInfo,
  describeFailure,
  listAliases,
} from '../../engine/engine';
import type { CommandContext } from './command-types';
import { matchesPattern, requireConnection } from './command-utils';
import { pushFailure, pushLine } from './output';

/**
 * Shows the alias tree.
 *
 * @param context - What the command can act on.
 * @param pattern - An alias name or pattern; all aliases when omitted.
 * @returns Nothing.
 */
export async function runAliasLs(
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
      pushLine(context.session, 'No aliases match.', 'dim');
      return;
    }
    context.session.push(<AliasTree aliases={aliases} />, {
      label: 'the alias list',
      text: aliasTreeText(aliases),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
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
      pushLine(context.session, 'No aliases match.', 'dim');
      return;
    }
    context.session.startRemove({ kind: 'alias', targets: aliases });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Formats one target line of the alias tree, without the branch prefix.
 *
 * @param target - The alias target.
 * @returns The line text.
 */
function targetText(target: AliasInfo['targets'][number]): string {
  const write = target.write ? ' (write)' : '';
  const filtered = target.filtered ? ' filtered' : '';
  return `${target.index}${write}${filtered}`;
}

/**
 * Formats the alias tree as the plain text the block renders.
 *
 * @param aliases - The aliases to format.
 * @returns The tree text.
 */
function aliasTreeText(aliases: AliasInfo[]): string {
  return aliases
    .flatMap((alias) => [
      alias.name,
      ...alias.targets.map(
        (target, index) =>
          `${index === alias.targets.length - 1 ? '└─ ' : '├─ '}${targetText(target)}`,
      ),
    ])
    .join('\n');
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
