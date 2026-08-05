// The /profile add wizard UI: renders the machine's questions.

import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  ProfileAddMachine,
  type ProfileAnswers,
  type Question,
} from './profile-add-machine';

/** The wizard contract. */
export interface ProfileAddWizardProps {
  /** Called with the answers when the wizard completes. */
  onSubmit: (answers: ProfileAnswers) => void;
  /** Called when the user cancels with escape. */
  onCancel: () => void;
  /** Answers of a failed attempt, resuming at the host step. */
  initialAnswers?: ProfileAnswers;
  /** The failure message of the previous attempt. */
  error?: string;
}

/**
 * Renders the connect wizard.
 *
 * @param props - The component props.
 * @returns The wizard element.
 */
export function ProfileAddWizard(props: ProfileAddWizardProps): ReactElement {
  const [machine, setMachine] = useState(() =>
    ProfileAddMachine.start(props.initialAnswers),
  );
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      props.onCancel();
    }
  });
  const answer = (value: string | boolean): void => {
    const next = machine.answer(value);
    if (next.result !== undefined) {
      props.onSubmit(next.result);
      return;
    }
    setMachine(next);
  };
  return (
    <Box
      borderColor="cyan"
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
    >
      <Text color="cyan">Connect to a cluster (esc or ctrl+c to cancel)</Text>
      {props.error !== undefined && <Text color="red">✖ {props.error}</Text>}
      <QuestionView
        key={machine.step}
        onAnswer={answer}
        question={machine.question}
      />
    </Box>
  );
}

/**
 * Renders one question.
 *
 * @param props - The component props.
 * @param props.question - The question to render.
 * @param props.onAnswer - Called with the answer.
 * @returns The question element.
 */
function QuestionView(props: {
  question: Question;
  onAnswer: (value: string | boolean) => void;
}): ReactElement {
  if (props.question.kind === 'select') {
    return (
      <Box flexDirection="column">
        <Text>{props.question.label}</Text>
        <SelectInput
          items={props.question.items ?? []}
          onSelect={(item) => props.onAnswer(item.value)}
        />
      </Box>
    );
  }
  return <TextQuestion onAnswer={props.onAnswer} question={props.question} />;
}

/**
 * Renders one text question.
 *
 * @param props - The component props.
 * @param props.question - The question to render.
 * @param props.onAnswer - Called with the entered text.
 * @returns The question element.
 */
function TextQuestion(props: {
  question: Question;
  onAnswer: (value: string) => void;
}): ReactElement {
  const [value, setValue] = useState('');
  const submit = (raw: string): void => {
    const trimmed = raw.trim();
    const final = trimmed === '' ? (props.question.fallback ?? '') : trimmed;
    if (final !== '') {
      props.onAnswer(final);
    }
  };
  return (
    <Box>
      <Text>
        {props.question.label}
        {props.question.fallback !== undefined
          ? ` [${props.question.fallback}]`
          : ''}
        {': '}
      </Text>
      <TextInput
        mask={props.question.mask === true ? '•' : undefined}
        onChange={setValue}
        onSubmit={submit}
        value={value}
      />
    </Box>
  );
}
