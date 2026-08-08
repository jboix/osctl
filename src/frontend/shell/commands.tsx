// The command registry and the router. /help and the suggestions render from it.

import { Box, Text } from 'ink';
import type { ReactElement } from 'react';
import packageJson from '../../../package.json';
import { ProfileStore } from '../../engine/engine';
import { runAliasLs, runAliasRm } from './alias-commands';
import { runClusterInfo } from './cluster-commands';
import type { Command, CommandContext } from './command-types';
import { matchesPattern, requireConnection } from './command-utils';
import { runCopy } from './copy-command';
import {
  runIndexCreate,
  runIndexLs,
  runIndexRm,
  runIndexRollover,
} from './index-commands';
import { pushLine } from './output';
import {
  runPolicyApply,
  runPolicyExplain,
  runPolicyLs,
  runPolicyRm,
  runPolicyShow,
} from './policy-commands';
import {
  runTemplateApply,
  runTemplateLs,
  runTemplateRm,
  runTemplateShow,
} from './template-commands';

export type { Command, CommandContext } from './command-types';

const COMMANDS: Command[] = [
  {
    name: '/index ls',
    description: 'List the indices: /index ls [pattern]',
    run: (context, args) => void runIndexLs(context, args[0]),
  },
  {
    name: '/index rm',
    description: 'Delete indices from a selection: /index rm [pattern]',
    run: (context, args) => void runIndexRm(context, args[0]),
  },
  {
    name: '/index create',
    description: 'Create an index: /index create <name> [write-alias]',
    run: (context, args) => void runIndexCreate(context, args[0], args[1]),
  },
  {
    name: '/index rollover',
    description: 'Roll over a write alias and carry its aliases',
    run: (context, args) => void runIndexRollover(context, args[0]),
  },
  {
    name: '/alias ls',
    description: 'Show which alias points at which index: /alias ls [pattern]',
    run: (context, args) => void runAliasLs(context, args[0]),
  },
  {
    name: '/alias apply',
    description: 'Edit alias actions in your editor and apply them',
    run: (context) => {
      if (requireConnection(context) !== undefined) {
        context.session.startAliasEdit();
      }
    },
  },
  {
    name: '/alias rm',
    description: 'Remove aliases from a selection: /alias rm [pattern]',
    run: (context, args) => void runAliasRm(context, args[0]),
  },
  {
    name: '/template ls',
    description: 'List the index templates: /template ls [pattern]',
    run: (context, args) => void runTemplateLs(context, args[0]),
  },
  {
    name: '/template show',
    description: 'Print a template, from a picker: /template show [name]',
    run: (context, args) => runTemplateShow(context, args[0]),
  },
  {
    name: '/template apply',
    description: 'Edit a template in your editor: /template apply [name]',
    run: (context, args) => runTemplateApply(context, args[0]),
  },
  {
    name: '/template rm',
    description: 'Delete templates from a selection: /template rm [pattern]',
    run: (context, args) => void runTemplateRm(context, args[0]),
  },
  {
    name: '/policy ls',
    description: 'List the ISM policies: /policy ls [pattern]',
    run: (context, args) => void runPolicyLs(context, args[0]),
  },
  {
    name: '/policy show',
    description: 'Print a policy, from a picker: /policy show [name]',
    run: (context, args) => runPolicyShow(context, args[0]),
  },
  {
    name: '/policy apply',
    description: 'Edit a policy in your editor: /policy apply [name]',
    run: (context, args) => runPolicyApply(context, args[0]),
  },
  {
    name: '/policy rm',
    description: 'Delete policies from a selection: /policy rm [pattern]',
    run: (context, args) => void runPolicyRm(context, args[0]),
  },
  {
    name: '/policy explain',
    description: 'Show the ISM state per index: /policy explain [pattern]',
    run: (context, args) => void runPolicyExplain(context, args[0]),
  },
  {
    name: '/cluster info',
    description: 'Show the cluster health, blocks, and disk usage',
    run: (context) => void runClusterInfo(context),
  },
  {
    name: '/profile add',
    description: 'Add a cluster profile and connect to it',
    run: (context) => context.session.startProfileAdd(),
  },
  {
    name: '/profile ls',
    description: 'List the profiles and switch by selecting one',
    run: (context) => context.navigate('/profile/ls'),
  },
  {
    name: '/profile default',
    description: 'Set the default profile: /profile default [name]',
    run: runProfileDefault,
  },
  {
    name: '/profile rm',
    description: 'Delete profiles from a selection: /profile rm [pattern]',
    run: (context, args) => runProfileRm(context, args[0]),
  },
  {
    name: '/copy',
    description: 'Copy the last command output to the clipboard',
    run: (context) => runCopy(context),
  },
  {
    name: '/help',
    description: 'Show the available commands',
    run: (context) =>
      context.session.push(<Help />, {
        label: 'the command list',
        text: helpLines().join('\n'),
      }),
  },
  {
    name: '/version',
    description: 'Print the osctl version',
    run: (context) =>
      pushLine(context.session, `osctl v${packageJson.version}`),
  },
  {
    name: '/exit',
    description: 'Quit osctl',
    run: (context) => context.exit(),
  },
];

/** The width the command names are padded to in lists. */
export const NAME_WIDTH = 17;

/**
 * Returns the commands matching a partially typed line. The leading `/` is
 * optional.
 *
 * @param input - The current input value.
 * @returns The matching commands.
 */
export function suggest(input: string): Command[] {
  const bare = input.startsWith('/') ? input.slice(1) : input;
  return COMMANDS.filter((command) => command.name.slice(1).startsWith(bare));
}

/**
 * Routes a submitted line to its command.
 *
 * @param line - The trimmed command line. The leading `/` may be omitted.
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export function route(line: string, context: CommandContext): void {
  const normalized = line.startsWith('/') ? line : `/${line}`;
  const command = COMMANDS.find(
    (candidate) =>
      normalized === candidate.name ||
      normalized.startsWith(`${candidate.name} `),
  );
  if (command === undefined) {
    pushLine(
      context.session,
      `Unknown command "${line}". Type /help.`,
      'yellow',
    );
    return;
  }
  const rest = normalized.slice(command.name.length).trim();
  command.run(context, rest === '' ? [] : rest.split(/\s+/));
}

/**
 * Sets the default profile, interactively when no name is given.
 *
 * @param context - What the command can act on.
 * @param args - The command arguments; the first one is the profile name.
 * @returns Nothing.
 */
function runProfileDefault(context: CommandContext, args: string[]): void {
  const name = args[0];
  if (name === undefined) {
    context.navigate('/profile/default');
    return;
  }
  const profile = new ProfileStore().setDefault(name);
  if (profile === undefined) {
    pushLine(
      context.session,
      `No profile named "${name}". Run /profile ls.`,
      'yellow',
    );
    return;
  }
  pushLine(context.session, `Default profile set to "${name}".`);
}

/**
 * Opens the deletion screen for the profiles matching the pattern.
 *
 * @param context - What the command can act on.
 * @param pattern - A profile name or pattern; all profiles when omitted.
 * @returns Nothing.
 */
function runProfileRm(context: CommandContext, pattern?: string): void {
  const profiles = new ProfileStore()
    .load()
    .profiles.filter((profile) => matchesPattern(profile.name, pattern));
  if (profiles.length === 0) {
    pushLine(context.session, 'No profiles match.', 'dim');
    return;
  }
  context.session.startRemove({
    kind: 'profile',
    items: profiles.map((profile) => ({
      label: `${profile.name.padEnd(16)} ${profile.host}`,
      value: profile.name,
    })),
  });
}

/**
 * Formats the command list as plain lines, one per command.
 *
 * @returns The formatted lines.
 */
function helpLines(): string[] {
  return COMMANDS.map(
    (command) => `${command.name.padEnd(NAME_WIDTH)} ${command.description}`,
  );
}

/**
 * Renders the command list from the registry.
 *
 * @returns The help block.
 */
function Help(): ReactElement {
  return (
    <Box flexDirection="column">
      {helpLines().map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </Box>
  );
}
