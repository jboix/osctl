// The /alias apply screen: collect the actions JSON, preview, confirm.

import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { JsonInput } from '../components/json-input';

const DOCS_URL =
  'https://docs.opensearch.org/docs/latest/im-plugin/index-alias/';

/** The screen contract. */
export interface AliasApplyScreenProps {
  /** Called with the parsed payload when the actions are confirmed. */
  onConfirm: (payload: unknown) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
}

/**
 * Renders the apply flow: the JSON input first, then the preview.
 *
 * @param props - The component props.
 * @returns The screen element.
 */
export function AliasApplyScreen(props: AliasApplyScreenProps): ReactElement {
  const [payload, setPayload] = useState<unknown>();
  if (payload === undefined) {
    return (
      <JsonInput
        docsUrl={DOCS_URL}
        onCancel={props.onCancel}
        onSubmit={setPayload}
        title="Apply alias actions"
      />
    );
  }
  return (
    <Preview
      onConfirm={() => props.onConfirm(payload)}
      onReject={props.onCancel}
      payload={payload}
    />
  );
}

/**
 * Renders the pretty printed payload and asks for the confirmation.
 *
 * @param props - The component props.
 * @param props.payload - The parsed payload.
 * @param props.onConfirm - Called on yes.
 * @param props.onReject - Called on no.
 * @returns The preview element.
 */
function Preview(props: {
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
      <Text color="cyan">Apply these alias actions?</Text>
      <Text dimColor>{JSON.stringify(props.payload, null, 2)}</Text>
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
