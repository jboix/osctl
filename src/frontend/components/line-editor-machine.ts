// The pure line-editing state machine behind the command input.

import type { Key } from 'ink';

/** The full editor state. */
interface EditorState {
  /** The current line. */
  value: string;
  /** The caret position, 0 to value.length. */
  cursor: number;
  /** The remembered lines, oldest first. */
  history: string[];
  /** The history browse position, counted back from the end; -1 is off. */
  historyCursor: number;
  /** The line being typed before history browsing started. */
  draft: string;
  /** The line submitted by the last keystroke. */
  submitted?: string;
  /** Whether the last keystroke was ctrl+c on an empty line. */
  interrupted?: boolean;
}

/**
 * Drives the command input: insertion, readline-style editing, and history.
 */
export class LineEditor {
  /** The wrapped state. */
  private readonly state: EditorState;

  /**
   * Creates an editor over the given state.
   *
   * @param state - The full editor state.
   */
  private constructor(state: EditorState) {
    this.state = state;
  }

  /** The current line. */
  get value(): string {
    return this.state.value;
  }

  /** The caret position, 0 to value.length. */
  get cursor(): number {
    return this.state.cursor;
  }

  /** The remembered lines, oldest first. */
  get history(): string[] {
    return this.state.history;
  }

  /** The line submitted by the last keystroke, when there was one. */
  get submitted(): string | undefined {
    return this.state.submitted;
  }

  /** Whether the last keystroke was ctrl+c on an empty line. */
  get interrupted(): boolean {
    return this.state.interrupted === true;
  }

  /**
   * Creates an empty editor.
   *
   * @param history - The remembered lines to browse, oldest first.
   * @returns The starting editor state.
   */
  static create(history: string[] = []): LineEditor {
    return new LineEditor({
      value: '',
      cursor: 0,
      history,
      historyCursor: -1,
      draft: '',
    });
  }

  /**
   * Applies one keystroke.
   *
   * @param input - The printable characters of the keystroke.
   * @param key - The special-key flags.
   * @returns The next editor state.
   */
  key(input: string, key: Key): LineEditor {
    const state: EditorState = {
      ...this.state,
      submitted: undefined,
      interrupted: undefined,
    };
    const handler = HANDLERS.find((candidate) => candidate.matches(key, input));
    if (handler !== undefined) {
      return new LineEditor(handler.apply(state, input));
    }
    if (input.length === 0 || key.ctrl || key.meta) {
      return new LineEditor(state);
    }
    return new LineEditor(insert(state, input));
  }

  /**
   * Replaces the line, placing the caret at its end.
   *
   * @param value - The new line.
   * @returns The next editor state.
   */
  withValue(value: string): LineEditor {
    return new LineEditor({
      ...this.state,
      value,
      cursor: value.length,
      historyCursor: -1,
      submitted: undefined,
      interrupted: undefined,
    });
  }

  /**
   * Appends a line to the history. Consecutive duplicates are stored once.
   *
   * @param line - The executed line.
   * @returns The next editor state.
   */
  remember(line: string): LineEditor {
    const history = this.state.history;
    if (line === '' || history[history.length - 1] === line) {
      return this;
    }
    return new LineEditor({ ...this.state, history: [...history, line] });
  }
}

/** One keystroke handler. */
interface Handler {
  /** Whether the handler applies to the keystroke. */
  matches: (key: Key, input: string) => boolean;
  /** Applies the keystroke to the state. */
  apply: (state: EditorState, input: string) => EditorState;
}

const HANDLERS: Handler[] = [
  { matches: (key) => key.return, apply: (state) => submit(state) },
  { matches: (key, input) => !key.ctrl && /[\r\n]/.test(input), apply: chunk },
  { matches: (key) => key.backspace, apply: deleteBackward },
  { matches: (key) => key.delete, apply: deleteForward },
  { matches: (key, input) => key.ctrl && input === 'w', apply: killWordBack },
  { matches: (key, input) => key.ctrl && input === 'u', apply: killToStart },
  { matches: (key, input) => key.ctrl && input === 'k', apply: killToEnd },
  {
    matches: (key, input) => key.home || (key.ctrl && input === 'a'),
    apply: (state) => ({ ...state, cursor: 0 }),
  },
  {
    matches: (key, input) => key.end || (key.ctrl && input === 'e'),
    apply: (state) => ({ ...state, cursor: state.value.length }),
  },
  {
    matches: (key, input) => key.ctrl && input === 'c',
    apply: clearOrInterrupt,
  },
  { matches: (key) => key.escape, apply: clear },
  {
    matches: (key) => key.leftArrow && (key.meta || key.ctrl),
    apply: (state) => ({ ...state, cursor: wordStart(state) }),
  },
  {
    matches: (key) => key.rightArrow && (key.meta || key.ctrl),
    apply: (state) => ({ ...state, cursor: wordEnd(state) }),
  },
  {
    matches: (key) => key.leftArrow,
    apply: (state) => ({ ...state, cursor: Math.max(state.cursor - 1, 0) }),
  },
  {
    matches: (key) => key.rightArrow,
    apply: (state) => ({
      ...state,
      cursor: Math.min(state.cursor + 1, state.value.length),
    }),
  },
  { matches: (key) => key.upArrow, apply: historyBack },
  { matches: (key) => key.downArrow, apply: historyForward },
];

/**
 * Inserts text at the caret.
 *
 * @param state - The editor state.
 * @param text - The text to insert.
 * @returns The next state.
 */
function insert(state: EditorState, text: string): EditorState {
  const value =
    state.value.slice(0, state.cursor) + text + state.value.slice(state.cursor);
  return { ...state, value, cursor: state.cursor + text.length };
}

/**
 * Submits the current line and clears the editor.
 *
 * @param state - The editor state.
 * @returns The next state, carrying the submitted line.
 */
function submit(state: EditorState): EditorState {
  return {
    ...state,
    value: '',
    cursor: 0,
    historyCursor: -1,
    draft: '',
    submitted: state.value,
  };
}

/**
 * Inserts the chunk text before its first newline, then submits.
 *
 * @param state - The editor state.
 * @param input - The pasted chunk containing a newline.
 * @returns The next state, carrying the submitted line.
 */
function chunk(state: EditorState, input: string): EditorState {
  const index = input.search(/[\r\n]/);
  return submit(insert(state, input.slice(0, index)));
}

/**
 * Deletes the character before the caret.
 *
 * @param state - The editor state.
 * @returns The next state.
 */
function deleteBackward(state: EditorState): EditorState {
  if (state.cursor === 0) {
    return state;
  }
  const value =
    state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor);
  return { ...state, value, cursor: state.cursor - 1 };
}

/**
 * Deletes the character at the caret.
 *
 * @param state - The editor state.
 * @returns The next state.
 */
function deleteForward(state: EditorState): EditorState {
  const value =
    state.value.slice(0, state.cursor) + state.value.slice(state.cursor + 1);
  return { ...state, value };
}

/**
 * Deletes the word before the caret, trailing spaces included.
 *
 * @param state - The editor state.
 * @returns The next state.
 */
function killWordBack(state: EditorState): EditorState {
  const start = wordStart(state);
  const value = state.value.slice(0, start) + state.value.slice(state.cursor);
  return { ...state, value, cursor: start };
}

/**
 * Deletes from the line start to the caret.
 *
 * @param state - The editor state.
 * @returns The next state.
 */
function killToStart(state: EditorState): EditorState {
  return { ...state, value: state.value.slice(state.cursor), cursor: 0 };
}

/**
 * Deletes from the caret to the line end.
 *
 * @param state - The editor state.
 * @returns The next state.
 */
function killToEnd(state: EditorState): EditorState {
  return { ...state, value: state.value.slice(0, state.cursor) };
}

/**
 * Clears the line, or flags the interrupt when it is already empty.
 *
 * @param state - The editor state.
 * @returns The next state.
 */
function clearOrInterrupt(state: EditorState): EditorState {
  if (state.value === '') {
    return { ...state, interrupted: true };
  }
  return clear(state);
}

/**
 * Clears the line and leaves history browsing.
 *
 * @param state - The editor state.
 * @returns The next state.
 */
function clear(state: EditorState): EditorState {
  return { ...state, value: '', cursor: 0, historyCursor: -1, draft: '' };
}

/**
 * Finds the start of the word before the caret.
 *
 * @param state - The editor state.
 * @returns The position where the word starts.
 */
function wordStart(state: EditorState): number {
  let position = state.cursor;
  while (position > 0 && state.value[position - 1] === ' ') {
    position -= 1;
  }
  while (position > 0 && state.value[position - 1] !== ' ') {
    position -= 1;
  }
  return position;
}

/**
 * Finds the end of the word after the caret.
 *
 * @param state - The editor state.
 * @returns The position where the word ends.
 */
function wordEnd(state: EditorState): number {
  const { value } = state;
  let position = state.cursor;
  while (position < value.length && value[position] === ' ') {
    position += 1;
  }
  while (position < value.length && value[position] !== ' ') {
    position += 1;
  }
  return position;
}

/**
 * Recalls the previous history line, saving the draft on entry.
 *
 * @param state - The editor state.
 * @returns The next state.
 */
function historyBack(state: EditorState): EditorState {
  const count = state.history.length;
  if (count === 0) {
    return state;
  }
  const draft = state.historyCursor === -1 ? state.value : state.draft;
  const next = Math.min(state.historyCursor + 1, count - 1);
  const value = state.history[count - 1 - next] ?? '';
  return { ...state, value, cursor: value.length, historyCursor: next, draft };
}

/**
 * Moves forward in the history, restoring the draft past the newest line.
 *
 * @param state - The editor state.
 * @returns The next state.
 */
function historyForward(state: EditorState): EditorState {
  if (state.historyCursor === -1) {
    return state;
  }
  const count = state.history.length;
  const next = state.historyCursor - 1;
  const value =
    next === -1 ? state.draft : (state.history[count - 1 - next] ?? '');
  return { ...state, value, cursor: value.length, historyCursor: next };
}
