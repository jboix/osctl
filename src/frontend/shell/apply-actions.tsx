// The JSON apply flow: aliases, templates, and policies.

import { Text } from 'ink';
import {
  applyAliases,
  applyPolicy,
  applyTemplate,
  createIndex,
  describeFailure,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import type {
  JsonApplyState,
  SessionActions,
  SessionDeps,
} from './session-types';

const DOCS: Record<JsonApplyState['kind'], string> = {
  alias: 'https://docs.opensearch.org/docs/latest/im-plugin/index-alias/',
  index:
    'https://docs.opensearch.org/docs/latest/api-reference/index-apis/create-index/',
  template:
    'https://docs.opensearch.org/docs/latest/im-plugin/index-templates/',
  policy: 'https://docs.opensearch.org/docs/latest/im-plugin/ism/policies/',
};

/**
 * Resolves the title and the docs link of an apply target.
 *
 * @param state - The apply target.
 * @returns The screen title and the format documentation link.
 */
export function applyPresentation(state: JsonApplyState): {
  title: string;
  docsUrl: string;
  allowEmpty?: boolean;
} {
  if (state.kind === 'alias') {
    return { title: 'Apply alias actions', docsUrl: DOCS.alias };
  }
  if (state.kind === 'index') {
    return {
      title: `Create index "${state.name}"`,
      docsUrl: DOCS.index,
      allowEmpty: true,
    };
  }
  if (state.kind === 'template') {
    return { title: `Template "${state.name}"`, docsUrl: DOCS.template };
  }
  return { title: `Policy "${state.name}"`, docsUrl: DOCS.policy };
}

/**
 * Builds the JSON apply actions.
 *
 * @param deps - The session state setters and the navigation.
 * @returns The apply actions.
 */
export function createApplyActions(
  deps: SessionDeps,
): Pick<SessionActions, 'startApply' | 'cancelApply' | 'executeApply'> {
  return {
    startApply: (state: JsonApplyState): void => {
      deps.setApplyState(state);
      deps.navigate('/apply');
    },
    cancelApply: (): void => {
      deps.setApplyState(undefined);
      deps.navigate('/');
    },
    executeApply: (payload: unknown): void => {
      const state = deps.applyState;
      deps.setApplyState(undefined);
      deps.navigate('/');
      if (state !== undefined) {
        void finishApply(state, payload, deps);
      }
    },
  };
}

/**
 * Applies the confirmed payload to its target and reports the outcome.
 *
 * @param state - The apply target.
 * @param payload - The parsed JSON payload.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function finishApply(
  state: JsonApplyState,
  payload: unknown,
  deps: SessionDeps,
): Promise<void> {
  if (deps.connection === undefined) {
    return;
  }
  try {
    deps.push(await runApply(state, payload, deps));
  } catch (error) {
    deps.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Runs the apply of one target and builds its confirmation block.
 *
 * @param state - The apply target.
 * @param payload - The parsed JSON payload.
 * @param deps - The session state setters and the navigation.
 * @returns The confirmation block.
 */
async function runApply(
  state: JsonApplyState,
  payload: unknown,
  deps: SessionDeps,
): Promise<React.JSX.Element> {
  const connection = deps.connection;
  if (connection === undefined) {
    throw new Error('Not connected.');
  }
  if (state.kind === 'alias') {
    const applied = await applyAliases(connection, payload);
    return (
      <Text color="green">
        ✔ Applied {applied} alias {applied === 1 ? 'action' : 'actions'}.
      </Text>
    );
  }
  if (state.kind === 'index') {
    await createIndex(connection, state.name, payload);
    return <Text color="green">✔ Index "{state.name}" created.</Text>;
  }
  if (state.kind === 'template') {
    await applyTemplate(connection, state.name, payload);
    return <Text color="green">✔ Template "{state.name}" saved.</Text>;
  }
  const outcome = await applyPolicy(connection, state.name, payload);
  return (
    <Text color="green">
      ✔ Policy "{state.name}" {outcome}.
    </Text>
  );
}
