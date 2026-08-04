// The REPL frame: scrollback above, routed input area, status bar below.

import { Box, type Key, Static, Text, useApp, useInput, useStdout } from 'ink';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import packageJson from '../../../package.json';
import { ProfileStore } from '../../engine/engine';
import { Header } from '../components/header';
import { LineEditorView } from '../components/line-editor';
import type { LineEditor } from '../components/line-editor-machine';
import { PasswordPrompt } from '../components/password-prompt';
import { StatusBar } from '../components/status-bar';
import { IndexRmScreen } from '../screens/index-rm';
import { ProfileAddWizard } from '../screens/profile-add';
import { ProfileSelect } from '../screens/profile-select';
import {
  type Command,
  type CommandContext,
  NAME_WIDTH,
  route,
  suggest,
} from './commands';
import { type OutputItem, type Session, useSession } from './session';

/**
 * Renders the REPL shell.
 *
 * @returns The root element of the frontend.
 */
export function Shell(): ReactElement {
  const session = useSession(<Header version={packageJson.version} />);
  const generation = useResizeRedraw();
  return (
    <Box flexDirection="column" paddingX={1}>
      <Static items={session.outputs} key={generation}>
        {(item: OutputItem) => (
          <Box key={item.id} paddingX={1}>
            {item.node}
          </Box>
        )}
      </Static>
      <Box flexDirection="column" marginTop={1}>
        <Routes>
          <Route element={<CommandInput session={session} />} path="/" />
          <Route
            element={<ProfileAddRoute session={session} />}
            path="/profile/add"
          />
          <Route
            element={<ProfileLsRoute session={session} />}
            path="/profile/ls"
          />
          <Route
            element={<ProfileDefaultRoute session={session} />}
            path="/profile/default"
          />
          <Route
            element={<PasswordRoute session={session} />}
            path="/password"
          />
          <Route
            element={<IndexRmRoute session={session} />}
            path="/index/rm"
          />
        </Routes>
        <StatusBar {...session.status} />
      </Box>
    </Box>
  );
}

/**
 * Redraws everything when the terminal is resized: the stale frame rewraps
 * and breaks the layout, so the viewport is cleared and the scrollback is
 * re-rendered at the new width.
 *
 * @returns The scrollback generation, bumped on every resize.
 */
function useResizeRedraw(): number {
  const { stdout, write } = useStdout();
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const redraw = (): void => {
      write('\u001B[2J\u001B[H');
      setGeneration((current) => current + 1);
    };
    stdout.on('resize', redraw);
    return () => {
      stdout.off('resize', redraw);
    };
  }, [stdout, write]);
  return generation;
}

/**
 * Renders the /profile/add screen.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The wizard element.
 */
function ProfileAddRoute(props: { session: Session }): ReactElement {
  return (
    <ProfileAddWizard
      error={props.session.addState?.error}
      initialAnswers={props.session.addState?.answers}
      onCancel={props.session.cancelProfileAdd}
      onSubmit={props.session.submitProfileAdd}
    />
  );
}

/**
 * Renders the /profile/ls screen: pick a profile to switch to.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The picker element.
 */
function ProfileLsRoute(props: { session: Session }): ReactElement {
  const navigate = useNavigate();
  return (
    <ProfileSelect
      currentName={props.session.status.profileName}
      onCancel={() => navigate('/')}
      onPick={(profile) => {
        navigate('/');
        props.session.switchProfile(profile);
      }}
      profiles={new ProfileStore().load().profiles}
      title="Profiles"
    />
  );
}

/**
 * Renders the /profile/default screen: pick the profile to make default.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The picker element.
 */
function ProfileDefaultRoute(props: { session: Session }): ReactElement {
  const navigate = useNavigate();
  const config = new ProfileStore().load();
  return (
    <ProfileSelect
      currentName={config.defaultProfile}
      onCancel={() => navigate('/')}
      onPick={(profile) => {
        new ProfileStore().setDefault(profile.name);
        props.session.push(
          <Text>Default profile set to "{profile.name}".</Text>,
        );
        navigate('/');
      }}
      profiles={config.profiles}
      title="Set the default profile"
    />
  );
}

/**
 * Renders the /index/rm screen, or returns home without targets.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The deletion screen element.
 */
function IndexRmRoute(props: { session: Session }): ReactElement {
  const targets = props.session.rmState;
  if (targets === undefined) {
    return <Navigate to="/" />;
  }
  return (
    <IndexRmScreen
      onCancel={props.session.cancelIndexRm}
      onConfirm={props.session.executeIndexRm}
      targets={targets}
    />
  );
}

/**
 * Renders the /password screen, or returns home when nothing is pending.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The password prompt element.
 */
function PasswordRoute(props: { session: Session }): ReactElement {
  const profile = props.session.pendingProfile;
  if (profile === undefined) {
    return <Navigate to="/" />;
  }
  return (
    <PasswordPrompt
      host={profile.host}
      onSubmit={props.session.submitPassword}
      username={profile.username ?? ''}
    />
  );
}

/**
 * Renders the command input box, its suggestions, and routes submitted lines.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The input box element.
 */
function CommandInput(props: { session: Session }): ReactElement {
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
 * Applies one keystroke: tab moves the focus, a focused list consumes its
 * keys, everything else goes to the editor.
 *
 * @param input - The printable characters of the keystroke.
 * @param key - The special-key flags.
 * @param deps - The editor, the suggestions, and the command context.
 * @returns Nothing.
 */
function handleKeystroke(input: string, key: Key, deps: KeystrokeDeps): void {
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
    runHighlighted(deps);
    return true;
  }
  deps.suggestions.blur();
  return false;
}

/**
 * Runs the highlighted command and clears the input.
 *
 * @param deps - The editor, the suggestions, and the command context.
 * @returns Nothing.
 */
function runHighlighted(deps: KeystrokeDeps): void {
  const name = deps.suggestions.items[deps.suggestions.highlight]?.name;
  if (name === undefined) {
    return;
  }
  deps.suggestions.blur();
  deps.setEditor(deps.editor.withValue('').remember(name));
  runLine(name, deps.context);
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
 * Echoes the line to the scrollback and routes it.
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
          ? 'up and down move, enter runs, tab returns to the input'
          : 'tab selects a command'}
      </Text>
    </Box>
  );
}
