// The command registry and the router. /help and the suggestions render from it.

import { Box, Text } from 'ink';
import type { ReactElement } from 'react';
import packageJson from '../../../package.json';
import {
  type Connection,
  createIndex,
  type IndexInfo,
  listIndices,
  ProfileStore,
  rollover,
} from '../../engine/engine';
import { Table } from '../components/table';
import type { Session } from './session';

/** What a command can act on. */
export interface CommandContext {
  /** The running session. */
  session: Session;
  /** Ends the application. */
  exit: () => void;
  /** Moves the input area to another screen. */
  navigate: (to: string) => void;
}

/** One REPL command. */
export interface Command {
  /** The official name, with the leading slash. */
  name: string;
  /** One line shown by /help and the suggestions. */
  description: string;
  /** Runs the command. */
  run: (context: CommandContext, args: string[]) => void;
}

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
    description: 'Create an index: /index create <name>',
    run: (context, args) => void runIndexCreate(context, args[0]),
  },
  {
    name: '/index rollover',
    description: 'Roll over a write alias and carry its aliases',
    run: (context, args) => void runIndexRollover(context, args[0]),
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
    name: '/help',
    description: 'Show the available commands',
    run: (context) => context.session.push(<Help />),
  },
  {
    name: '/version',
    description: 'Print the osctl version',
    run: (context) =>
      context.session.push(<Text>osctl v{packageJson.version}</Text>),
  },
  {
    name: '/exit',
    description: 'Quit osctl',
    run: (context) => context.exit(),
  },
];

/**
 * Returns the live connection, reporting when there is none.
 *
 * @param context - What the command can act on.
 * @returns The connection, or undefined after reporting.
 */
function requireConnection(context: CommandContext): Connection | undefined {
  const connection = context.session.connection;
  if (connection === undefined) {
    context.session.push(
      <Text color="yellow">Not connected. Run /profile add.</Text>,
    );
  }
  return connection;
}

/**
 * Lists the indices and renders them as a table block.
 *
 * @param context - What the command can act on.
 * @param pattern - An index name or pattern; all indices when omitted.
 * @returns Nothing.
 */
async function runIndexLs(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const indices = await listIndices(connection, pattern);
    context.session.push(
      indices.length === 0 ? (
        <Text dimColor>No indices match.</Text>
      ) : (
        <IndexTable indices={indices} />
      ),
    );
  } catch (error) {
    context.session.push(<Text color="red">✖ {String(error)}</Text>);
  }
}

/**
 * Opens the deletion screen for the indices matching the pattern.
 *
 * @param context - What the command can act on.
 * @param pattern - An index name or pattern; all indices when omitted.
 * @returns Nothing.
 */
async function runIndexRm(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const indices = await listIndices(connection, pattern);
    if (indices.length === 0) {
      context.session.push(<Text dimColor>No indices match.</Text>);
      return;
    }
    context.session.startIndexRm(indices);
  } catch (error) {
    context.session.push(<Text color="red">✖ {String(error)}</Text>);
  }
}

/**
 * Creates an index and reports the outcome.
 *
 * @param context - What the command can act on.
 * @param name - The index name.
 * @returns Nothing.
 */
async function runIndexCreate(
  context: CommandContext,
  name?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  if (name === undefined) {
    context.session.push(
      <Text color="yellow">Usage: /index create {'<name>'}.</Text>,
    );
    return;
  }
  try {
    await createIndex(connection, name);
    context.session.push(<Text color="green">✔ Index "{name}" created.</Text>);
    if (!/-\d{6}$/.test(name)) {
      context.session.push(
        <Text color="yellow">
          The name has no numeric suffix like -000001: rollover will not work.
        </Text>,
      );
    }
  } catch (error) {
    context.session.push(<Text color="red">✖ {String(error)}</Text>);
  }
}

/**
 * Rolls over the alias, reapplying missing aliases, and reports the outcome.
 *
 * @param context - What the command can act on.
 * @param alias - The write alias to roll over.
 * @returns Nothing.
 */
async function runIndexRollover(
  context: CommandContext,
  alias?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  if (alias === undefined) {
    context.session.push(
      <Text color="yellow">Usage: /index rollover {'<alias>'}.</Text>,
    );
    return;
  }
  try {
    const result = await rollover(connection, alias);
    context.session.push(
      <Text color="green">
        ✔ Rolled over {alias}: {result.oldIndex} → {result.newIndex}.
      </Text>,
    );
    context.session.push(
      result.reapplied.length === 0 ? (
        <Text dimColor>No aliases to reapply.</Text>
      ) : (
        <Text>Reapplied aliases: {result.reapplied.join(', ')}.</Text>
      ),
    );
  } catch (error) {
    context.session.push(<Text color="red">✖ {String(error)}</Text>);
  }
}

/**
 * Renders the index listing as a table.
 *
 * @param props - The component props.
 * @param props.indices - The indices to list.
 * @returns The table element.
 */
function IndexTable(props: { indices: IndexInfo[] }): ReactElement {
  const columns = [
    { label: 'index' },
    { label: 'health' },
    { label: 'docs', alignRight: true },
    { label: 'size', alignRight: true },
    { label: 'created' },
    { label: 'aliases (*: write)' },
  ];
  const rows = props.indices.map((index) => [
    index.name,
    index.health,
    String(index.docsCount),
    index.storeSize,
    index.creationDate,
    index.aliases.join(', '),
  ]);
  return <Table columns={columns} rows={rows} />;
}

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
    context.session.push(
      <Text color="yellow">Unknown command "{line}". Type /help.</Text>,
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
    context.session.push(
      <Text color="yellow">No profile named "{name}". Run /profile ls.</Text>,
    );
    return;
  }
  context.session.push(<Text>Default profile set to "{name}".</Text>);
}

/**
 * Renders the command list from the registry.
 *
 * @returns The help block.
 */
function Help(): ReactElement {
  return (
    <Box flexDirection="column">
      {COMMANDS.map((command) => (
        <Text key={command.name}>
          {command.name.padEnd(NAME_WIDTH)} {command.description}
        </Text>
      ))}
    </Box>
  );
}
