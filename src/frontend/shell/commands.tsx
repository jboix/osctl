// The command registry and the router. /help and the suggestions render from it.

import { Box, Text } from 'ink';
import { createRouter } from 'inkstand';
import type { ReactElement } from 'react';
import packageJson from '../../../package.json';
import { runAliasLs, runAliasRm } from './alias-commands';
import {
  runBackupApply,
  runBackupLs,
  runBackupRm,
  runBackupShow,
} from './backup-commands';
import {
  runClusterExplain,
  runClusterInfo,
  runClusterNodes,
  runClusterSettings,
} from './cluster-commands';
import type { Command, CommandContext } from './command-types';
import { requireConnection } from './command-utils';
import {
  runComponentApply,
  runComponentLs,
  runComponentRm,
  runComponentShow,
} from './component-commands';
import { runCopy } from './copy-command';
import {
  runIndexCreate,
  runIndexLs,
  runIndexRm,
  runIndexRollover,
  runIndexSettings,
  runIndexSettingsApply,
  runIndexShow,
} from './index-commands';
import { pushLine } from './output';
import {
  runPolicyApply,
  runPolicyExplain,
  runPolicyLs,
  runPolicyRm,
  runPolicyShow,
} from './policy-commands';
import { runProfileDefault, runProfileRm } from './profile-commands';
import {
  runSnapshotCreate,
  runSnapshotLs,
  runSnapshotRepoLs,
  runSnapshotRestore,
  runSnapshotRm,
  runSnapshotShow,
} from './snapshot-commands';
import { runTaskCancel, runTaskLs, runTaskShow } from './task-commands';
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
    name: '/index show',
    description: 'Print an index, from a picker: /index show [name]',
    run: (context, args) => runIndexShow(context, args[0]),
  },
  {
    name: '/index settings',
    description: 'Print the settings of an index: /index settings [name]',
    run: (context, args) => runIndexSettings(context, args[0]),
  },
  {
    name: '/index settings apply',
    description: 'Edit the settings of an index in your editor',
    run: (context, args) => runIndexSettingsApply(context, args[0]),
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
    name: '/component ls',
    description: 'List the component templates: /component ls [pattern]',
    run: (context, args) => void runComponentLs(context, args[0]),
  },
  {
    name: '/component show',
    description: 'Print a component template, from a picker',
    run: (context, args) => runComponentShow(context, args[0]),
  },
  {
    name: '/component apply',
    description: 'Edit a component template: /component apply [name]',
    run: (context, args) => runComponentApply(context, args[0]),
  },
  {
    name: '/component rm',
    description: 'Delete component templates from a selection',
    run: (context, args) => void runComponentRm(context, args[0]),
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
    name: '/cluster settings',
    description: 'Show the persistent and transient cluster settings',
    run: (context) => void runClusterSettings(context),
  },
  {
    name: '/cluster settings apply',
    description: 'Edit the cluster settings in your editor',
    run: (context) => {
      if (requireConnection(context) !== undefined) {
        context.session.startClusterSettingsEdit();
      }
    },
  },
  {
    name: '/cluster nodes',
    description: 'List the nodes with roles, version, heap, and load',
    run: (context) => void runClusterNodes(context),
  },
  {
    name: '/cluster explain',
    description: 'Explain why a shard is unassigned',
    run: (context) => void runClusterExplain(context),
  },
  {
    name: '/task ls',
    description: 'List the running tasks, longest running first',
    run: (context) => void runTaskLs(context),
  },
  {
    name: '/task show',
    description: 'Print a task with its status: /task show <id>',
    run: (context, args) => void runTaskShow(context, args[0]),
  },
  {
    name: '/task cancel',
    description: 'Cancel tasks from a selection: /task cancel [id]',
    run: (context, args) => void runTaskCancel(context, args[0]),
  },
  {
    name: '/snapshot repo ls',
    description: 'List the snapshot repositories',
    run: (context) => void runSnapshotRepoLs(context),
  },
  {
    name: '/snapshot ls',
    description: 'List the snapshots: /snapshot ls [repo]',
    run: (context, args) => void runSnapshotLs(context, args[0]),
  },
  {
    name: '/snapshot show',
    description: 'Print a snapshot: /snapshot show <repo> <name>',
    run: (context, args) => void runSnapshotShow(context, args[0], args[1]),
  },
  {
    name: '/snapshot create',
    description: 'Take a snapshot: /snapshot create <repo> <name>',
    run: (context, args) => runSnapshotCreate(context, args[0], args[1]),
  },
  {
    name: '/snapshot restore',
    description: 'Restore a snapshot: /snapshot restore <repo> <name>',
    run: (context, args) => runSnapshotRestore(context, args[0], args[1]),
  },
  {
    name: '/snapshot rm',
    description: 'Delete snapshots from a selection: /snapshot rm <repo>',
    run: (context, args) => void runSnapshotRm(context, args[0], args[1]),
  },
  {
    name: '/reindex',
    description: 'Edit a reindex body and run it as a background task',
    run: (context) => {
      if (requireConnection(context) !== undefined) {
        context.session.startReindex();
      }
    },
  },
  {
    name: '/backup ls',
    description: 'List the backups of this profile: /backup ls [pattern]',
    run: (context, args) => runBackupLs(context, args[0]),
  },
  {
    name: '/backup show',
    description: 'Print a backup, from a picker: /backup show [name]',
    run: (context, args) => runBackupShow(context, args[0]),
  },
  {
    name: '/backup apply',
    description:
      'Restore a backup after a diff confirmation: /backup apply [name]',
    run: (context, args) => runBackupApply(context, args[0]),
  },
  {
    name: '/backup rm',
    description: 'Delete backups from a selection: /backup rm [pattern]',
    run: (context, args) => runBackupRm(context, args[0]),
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

/** The pure router over the command list. */
const ROUTER = createRouter(COMMANDS);

/** The width the command names are padded to in lists. */
const NAME_WIDTH = 24;

/**
 * Returns the commands matching a partially typed line. The leading `/` is
 * optional.
 *
 * @param input - The current input value.
 * @returns The matching commands.
 */
export function suggest(input: string): Command[] {
  return ROUTER.suggest(input);
}

/**
 * Routes a submitted line to its command.
 *
 * @param line - The trimmed command line. The leading `/` may be omitted.
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export function route(line: string, context: CommandContext): void {
  const hit = ROUTER.match(line);
  if (hit === undefined) {
    pushLine(
      context.session,
      `Unknown command "${line}". Type /help.`,
      'yellow',
    );
    return;
  }
  void hit.command.run(context, hit.args);
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
