// A JSON apply flow: collect the payload, preview it, confirm.

import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { JsonInput } from '../components/json-input';

/** The screen contract. */
export interface JsonApplyScreenProps {
  /** The input box title. */
  title: string;
  /** A link to the documentation of the expected format. */
  docsUrl: string;
  /** Called with the parsed payload when it is confirmed. */
  onConfirm: (payload: unknown) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
  /** Whether an empty box is allowed, submitting an undefined payload. */
  allowEmpty?: boolean;
}

/**
 * Renders the flow: the JSON input first, then the preview.
 *
 * @param props - The component props.
 * @returns The screen element.
 */
export function JsonApplyScreen(props: JsonApplyScreenProps): ReactElement {
  const [payload, setPayload] = useState<{ value: unknown } | undefined>();
  if (payload === undefined) {
    return (
      <JsonInput
        allowEmpty={props.allowEmpty}
        docsUrl={props.docsUrl}
        onCancel={props.onCancel}
        onSubmit={(value) => setPayload({ value })}
        title={props.title}
      />
    );
  }
  return (
    <Preview
      onConfirm={() => props.onConfirm(payload.value)}
      onReject={props.onCancel}
      payload={payload.value}
      title={props.title}
    />
  );
}

/**
 * Renders the pretty printed payload and asks for the confirmation.
 *
 * @param props - The component props.
 * @param props.title - The confirmation title.
 * @param props.payload - The parsed payload.
 * @param props.onConfirm - Called on yes.
 * @param props.onReject - Called on no.
 * @returns The preview element.
 */
function Preview(props: {
  title: string;
  payload: unknown;
  onConfirm: () => void;
  onReject: () => void;
}): ReactElement {
  useInput((input, key) => {
    if (key.escape || input === 'q' || (key.ctrl && input === 'c')) {
      props.onReject();
    }
  });
  return (
    <Box
      borderColor="cyan"
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
    >
      <Text color="cyan">{props.title}: apply this?</Text>
      <Text dimColor>
        {props.payload === undefined
          ? '(no body)'
          : JSON.stringify(props.payload, null, 2)}
      </Text>
      <SelectInput
        items={[
          { label: 'no', value: false },
          { label: 'yes, apply', value: true },
        ]}
        onSelect={(item) => (item.value ? props.onConfirm() : props.onReject())}
      />
    </Box>
  );
}
