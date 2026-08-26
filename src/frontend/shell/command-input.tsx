// The command input: the line editor, the suggestions, and the router.

import { Box, Text, useApp, useInput } from 'ink';
import { type CommandInfo, CommandList, Prompt, useLineEditor } from 'inkstand';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { type Command, type CommandContext, route, suggest } from './commands';
import type { Session } from './session';

/**
 * Renders the command input box, its suggestions, and routes submitted lines.
 * Ctrl+o folds or expands the shown documents and tab moves the focus into
 * the suggestion list; the focused list reads its own keys through
 * `CommandList`, so the editor pauses while it is focused.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The input box element.
 */
export function CommandInput(props: { session: Session }): ReactElement {
  const { exit } = useApp();
  const navigate = useNavigate();
  const context: CommandContext = { session: props.session, exit, navigate };
  const [focused, setFocused] = useState(false);
  const { editor, setEditor } = useLineEditor(
    { onSubmit: (line) => runLine(line, context), onInterrupt: exit },
    { isActive: !focused },
  );
  const hits = suggest(editor.value);
  const listFocused = focused && hits.length > 0;
  useInput((input, key) => {
    if (key.ctrl && input === 'o') {
      props.session.toggleDocs();
    } else if (key.tab && !listFocused) {
      setFocused(hits.length > 0);
    }
  });
  return (
    <Box flexDirection="column">
      {hits.length > 0 && (listFocused || editor.value !== '') && (
        <Suggestions
          focused={listFocused}
          hits={hits}
          onBlur={() => setFocused(false)}
          onPick={(command) => setEditor(editor.withValue(`${command.name} `))}
        />
      )}
      <Prompt cursor={editor.cursor} value={editor.value} />
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
