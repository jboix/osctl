// The command input: the line editor, the suggestions, and the router.

import { Box, type Key, Text, useApp, useInput } from 'ink';
import {
  type CommandInfo,
  CommandList,
  type LineEditor,
  Prompt,
} from 'inkstand';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { type Command, type CommandContext, route, suggest } from './commands';
import type { Session } from './session';

/**
 * Renders the command input box, its suggestions, and routes submitted lines.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The input box element.
 */
export function CommandInput(props: { session: Session }): ReactElement {
  const { exit } = useApp();
  const navigate = useNavigate();
  const { editor, setEditor } = props.session;
  const [focused, setFocused] = useState(false);
  const hits = suggest(editor.value);
  const listFocused = focused && hits.length > 0;
  useInput((input, key) =>
    handleKeystroke(input, key, {
      context: { session: props.session, exit, navigate },
      editor,
      setEditor,
      focused: listFocused,
      setFocused,
      hits,
    }),
  );
  return (
    <Box flexDirection="column">
      <Prompt cursor={editor.cursor} value={editor.value} />
      {hits.length > 0 && (listFocused || editor.value !== '') && (
        <Suggestions
          focused={listFocused}
          hits={hits}
          onBlur={() => setFocused(false)}
          onPick={(command) => setEditor(editor.withValue(`${command.name} `))}
        />
      )}
    </Box>
  );
}

/** The suggestion rows shown at once. Hidden rows are counted around them. */
const SUGGESTION_ROWS = 8;

/**
 * Renders the suggestion list with its key hint.
 *
 * @param props - The component props.
 * @param props.hits - The commands matching the current input.
 * @param props.focused - Whether the list has the focus.
 * @param props.onPick - Called with the picked command.
 * @param props.onBlur - Called when a keystroke leaves the list.
 * @returns The suggestion area element.
 */
function Suggestions(props: {
  hits: Command[];
  focused: boolean;
  onPick: (command: CommandInfo) => void;
  onBlur: () => void;
}): ReactElement {
  return (
    <Box flexDirection="column">
      <CommandList
        commands={props.hits}
        dim
        focused={props.focused}
        maxRows={SUGGESTION_ROWS}
        onBlur={props.onBlur}
        onPick={props.onPick}
      />
      <Box paddingX={1}>
        <Text dimColor italic>
          {props.focused
            ? 'up and down move, enter picks, tab returns to the input'
            : 'tab selects a command'}
        </Text>
      </Box>
    </Box>
  );
}

/** What the keystroke handler drives. */
interface KeystrokeDeps {
  /** What the commands act on. */
  context: CommandContext;
  /** The current editor state. */
  editor: LineEditor;
  /** Replaces the editor state. */
  setEditor: (editor: LineEditor) => void;
  /** Whether the suggestion list has the focus. */
  focused: boolean;
  /** Sets the focus flag. */
  setFocused: (focused: boolean) => void;
  /** The commands matching the current input. */
  hits: Command[];
}

/**
 * Applies one keystroke: ctrl+o folds or expands the shown documents, tab
 * moves the focus into the suggestion list, and the rest goes to the editor.
 * The focused list reads its own keys through `CommandList`.
 *
 * @param input - The printable characters of the keystroke.
 * @param key - The special-key flags.
 * @param deps - The editor, the focus flag, and the command context.
 * @returns Nothing.
 */
function handleKeystroke(input: string, key: Key, deps: KeystrokeDeps): void {
  if (key.ctrl && input === 'o') {
    deps.context.session.toggleDocs();
    return;
  }
  if (key.tab) {
    if (!deps.focused) {
      deps.setFocused(deps.hits.length > 0);
    }
    return;
  }
  if (
    deps.focused &&
    (key.upArrow || key.downArrow || key.return || key.escape)
  ) {
    return;
  }
  applyEditorKey(input, key, deps);
}

/**
 * Applies the keystroke to the editor and runs a submitted line.
 *
 * @param input - The printable characters of the keystroke.
 * @param key - The special-key flags.
 * @param deps - The editor, the focus flag, and the command context.
 * @returns Nothing.
 */
function applyEditorKey(input: string, key: Key, deps: KeystrokeDeps): void {
  const next = deps.editor.key(input, key);
  if (next.interrupted) {
    deps.context.exit();
    return;
  }
  const line = next.submitted?.trim() ?? '';
  if (next.submitted === undefined || line === '') {
    deps.setEditor(next);
    return;
  }
  deps.setEditor(next.remember(line));
  runLine(line, deps.context);
}

/**
 * Echoes the line to the scrollback and routes it. The echo keeps the copy
 * payload of the previous output, so /copy can name it.
 *
 * @param line - The line to run.
 * @param context - What the commands act on.
 * @returns Nothing.
 */
function runLine(line: string, context: CommandContext): void {
  context.session.push(
    <Text dimColor>
      {'> '}
      {line}
    </Text>,
    'keep',
  );
  route(line, context);
}
