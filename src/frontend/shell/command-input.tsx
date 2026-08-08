// The command input: the line editor, the suggestions, and the router.

import { Box, type Key, Text, useApp, useInput } from 'ink';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LineEditorView } from '../components/line-editor';
import type { LineEditor } from '../components/line-editor-machine';
import {
  type Command,
  type CommandContext,
  NAME_WIDTH,
  route,
  suggest,
} from './commands';
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
  const suggestions = useSuggestions(editor.value);
  useInput((input, key) =>
    handleKeystroke(input, key, {
      context: { session: props.session, exit, navigate },
      editor,
      setEditor,
      suggestions,
    }),
  );
  return (
    <Box flexDirection="column">
      <Box borderStyle="round" paddingX={1}>
        <Text color="cyan">{'> '}</Text>
        <LineEditorView cursor={editor.cursor} value={editor.value} />
      </Box>
      <SuggestionList {...suggestions} />
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
  /** The suggestion list state. */
  suggestions: Suggestions;
}

/**
 * Applies one keystroke: ctrl+o folds or expands the shown documents, tab
 * moves the focus, a focused list consumes its keys, everything else goes to
 * the editor.
 *
 * @param input - The printable characters of the keystroke.
 * @param key - The special-key flags.
 * @param deps - The editor, the suggestions, and the command context.
 * @returns Nothing.
 */
function handleKeystroke(input: string, key: Key, deps: KeystrokeDeps): void {
  if (key.ctrl && input === 'o') {
    deps.context.session.toggleDocs();
    return;
  }
  if (key.tab) {
    deps.suggestions.toggle();
    return;
  }
  if (deps.suggestions.focused && listConsumes(key, deps)) {
    return;
  }
  applyEditorKey(input, key, deps);
}

/**
 * Handles a keystroke while the list has the focus.
 *
 * @param key - The special-key flags.
 * @param deps - The editor, the suggestions, and the command context.
 * @returns Whether the list consumed the keystroke.
 */
function listConsumes(key: Key, deps: KeystrokeDeps): boolean {
  if (key.upArrow || key.downArrow) {
    deps.suggestions.move(key.upArrow ? -1 : 1);
    return true;
  }
  if (key.escape) {
    deps.suggestions.blur();
    return true;
  }
  if (key.return) {
    completeHighlighted(deps);
    return true;
  }
  deps.suggestions.blur();
  return false;
}

/**
 * Writes the highlighted command into the input, without submitting it,
 * because many commands take further arguments.
 *
 * @param deps - The editor, the suggestions, and the command context.
 * @returns Nothing.
 */
function completeHighlighted(deps: KeystrokeDeps): void {
  const name = deps.suggestions.items[deps.suggestions.highlight]?.name;
  if (name === undefined) {
    return;
  }
  deps.suggestions.blur();
  deps.setEditor(deps.editor.withValue(`${name} `));
}

/**
 * Applies the keystroke to the editor and runs a submitted line.
 *
 * @param input - The printable characters of the keystroke.
 * @param key - The special-key flags.
 * @param deps - The editor, the suggestions, and the command context.
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

/** The suggestion list state and its actions. */
interface Suggestions {
  /** The commands matching the current input. */
  items: Command[];
  /** The index of the highlighted item. */
  highlight: number;
  /** Whether the list has the focus. */
  focused: boolean;
  /** Whether the list is shown. */
  visible: boolean;
  /** Moves the focus between the input and the list. */
  toggle: () => void;
  /** Returns the focus to the input. */
  blur: () => void;
  /** Moves the highlight by the given delta, wrapping around. */
  move: (delta: number) => void;
}

/**
 * Tracks the suggestions for the current input. The list is a passive hint
 * while the input has the focus; tab moves the focus into it.
 *
 * @param value - The current input value.
 * @returns The suggestion list state and its actions.
 */
function useSuggestions(value: string): Suggestions {
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const items = suggest(value);
  const clamped = Math.min(highlight, Math.max(items.length - 1, 0));
  return {
    items,
    highlight: clamped,
    focused: focused && items.length > 0,
    visible: items.length > 0 && (focused || value !== ''),
    toggle: (): void => {
      setHighlight(0);
      setFocused(items.length > 0 && !focused);
    },
    blur: (): void => setFocused(false),
    move: (delta: number): void =>
      setHighlight((clamped + delta + items.length) % items.length),
  };
}

/**
 * Renders the suggestions under the input box. The highlight marker appears
 * only while the list has the focus.
 *
 * @param props - The suggestion list state.
 * @returns The list element, or null while hidden.
 */
function SuggestionList(props: Suggestions): ReactElement | null {
  if (!props.visible) {
    return null;
  }
  return (
    <Box flexDirection="column" paddingX={1}>
      {props.items.map((command, index) => (
        <Text
          color={
            props.focused && index === props.highlight ? 'cyan' : undefined
          }
          dimColor={!props.focused || index !== props.highlight}
          key={command.name}
        >
          {props.focused && index === props.highlight ? '❯ ' : '  '}
          {command.name.slice(1).padEnd(NAME_WIDTH)} {command.description}
        </Text>
      ))}
      <Text dimColor italic>
        {props.focused
          ? 'up and down move, enter picks, tab returns to the input'
          : 'tab selects a command'}
      </Text>
    </Box>
  );
}
