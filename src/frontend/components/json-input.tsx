// The JSON input box: paste or type, validate live, finish with ctrl+d.

import { readFileSync } from 'node:fs';
import { Box, type Key, Text, useInput } from 'ink';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Caret } from './caret';
import {
  applyJsonKey,
  jsonError,
  looksLikeJsonPath,
  pathFrom,
} from './json-buffer';

/** The JSON input contract. */
export interface JsonInputProps {
  /** The box title. */
  title: string;
  /** A link to the documentation of the expected format. */
  docsUrl?: string;
  /** Called with the parsed payload when ctrl+d ends a valid input. */
  onSubmit: (payload: unknown) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
  /** Whether ctrl+d on an empty box submits an undefined payload. */
  allowEmpty?: boolean;
}

/**
 * Renders the input box with a live validation footer.
 *
 * @param props - The component props.
 * @returns The input element.
 */
export function JsonInput(props: JsonInputProps): ReactElement {
  const [text, setText] = useState('');
  const error = jsonError(text);
  useInput((input, key) =>
    handleJsonKey(input, key, { text, error, setText, ...props }),
  );
  return (
    <Box
      borderColor="cyan"
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
    >
      <Text color="cyan">{props.title} (ctrl+d when done, esc to cancel)</Text>
      {props.docsUrl !== undefined && (
        <Text dimColor>Format: {props.docsUrl}</Text>
      )}
      <Body allowEmpty={props.allowEmpty} error={error} text={text} />
    </Box>
  );
}

/** What the keystroke handler drives. */
interface JsonKeyDeps extends JsonInputProps {
  /** The current buffer text. */
  text: string;
  /** The validation error, when there is one. */
  error?: string;
  /** Replaces the buffer text. */
  setText: (text: string) => void;
}

/**
 * Applies one keystroke to the buffer and runs its outcome.
 *
 * @param input - The printable characters of the keystroke.
 * @param key - The special-key flags.
 * @param deps - The buffer state and the callbacks.
 * @returns Nothing.
 */
function handleJsonKey(input: string, key: Key, deps: JsonKeyDeps): void {
  const result = applyJsonKey(deps.text, input, key);
  if (result.cancelled) {
    deps.onCancel();
    return;
  }
  if (result.done) {
    submitDone(deps);
    return;
  }
  deps.setText(deps.text === '' ? loadWhenPath(result.text) : result.text);
}

/**
 * Submits the buffer on ctrl+d: empty when allowed, parsed otherwise.
 *
 * @param deps - The buffer state and the callbacks.
 * @returns Nothing.
 */
function submitDone(deps: JsonKeyDeps): void {
  if (deps.text.trim() === '' && deps.allowEmpty === true) {
    deps.onSubmit(undefined);
    return;
  }
  if (deps.error === undefined) {
    deps.onSubmit(JSON.parse(deps.text));
  }
}

/**
 * Loads the file when the first paste is a JSON file path.
 *
 * @param text - The buffer text after the first keystroke or paste.
 * @returns The file content, or the text when it is no readable path.
 */
function loadWhenPath(text: string): string {
  if (!looksLikeJsonPath(text)) {
    return text;
  }
  try {
    return readFileSync(pathFrom(text), 'utf8');
  } catch {
    return text;
  }
}

/**
 * Renders the buffer and the validation footer.
 *
 * @param props - The component props.
 * @param props.text - The buffer text.
 * @param props.error - The validation error, when there is one.
 * @returns The body element.
 */
function Body(props: {
  text: string;
  error?: string;
  allowEmpty?: boolean;
}): ReactElement {
  if (props.text === '') {
    return (
      <Text>
        <Caret key="" />
        <Text dimColor>
          {' '}
          Paste JSON, or the path of a .json file.
          {props.allowEmpty === true && ' Ctrl+d on the empty box skips it.'}
        </Text>
      </Text>
    );
  }
  return (
    <Box flexDirection="column">
      <Text>
        {props.text}
        <Caret key={props.text} />
      </Text>
      {props.error === undefined ? (
        <Text color="green">✔ valid JSON, ctrl+d to continue</Text>
      ) : (
        <Text color="red">✖ {props.error}</Text>
      )}
    </Box>
  );
}
