// The removal flow: indices, aliases, templates, and policies.

import { Text } from 'ink';
import {
  type Connection,
  deleteAlias,
  deleteIndices,
  deletePolicy,
  deleteTemplate,
  describeFailure,
  ProfileStore,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import type { RemoveState, SessionActions, SessionDeps } from './session-types';

/**
 * Builds the removal actions.
 *
 * @param deps - The session state setters and the navigation.
 * @returns The removal actions.
 */
export function createRemoveActions(
  deps: SessionDeps,
): Pick<SessionActions, 'startRemove' | 'cancelRemove' | 'executeRemove'> {
  return {
    startRemove: (state: RemoveState): void => {
      deps.setRemoveState(state);
      deps.navigate('/remove');
    },
    cancelRemove: (): void => {
      deps.setRemoveState(undefined);
      deps.navigate('/');
    },
    executeRemove: (names: string[]): void => {
      const state = deps.removeState;
      deps.setRemoveState(undefined);
      deps.navigate('/');
      if (state === undefined) {
        return;
      }
      if (state.kind === 'profile') {
        removeProfiles(names, deps);
        return;
      }
      if (deps.connection !== undefined) {
        void finishRemove(state, names, deps.connection, deps);
      }
    },
  };
}

/**
 * Deletes the confirmed profiles and reports each outcome.
 *
 * @param names - The confirmed profile names.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function removeProfiles(names: string[], deps: SessionDeps): void {
  const store = new ProfileStore();
  for (const name of names) {
    deps.push(
      store.remove(name) ? (
        <Text color="green">✔ Profile "{name}" deleted.</Text>
      ) : (
        <Text color="yellow">No profile named "{name}".</Text>
      ),
    );
  }
}

/**
 * Deletes the confirmed resources and reports the outcomes.
 *
 * @param state - The removal being run.
 * @param names - The confirmed names.
 * @param connection - The live connection.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function finishRemove(
  state: Exclude<RemoveState, { kind: 'profile' }>,
  names: string[],
  connection: Connection,
  deps: SessionDeps,
): Promise<void> {
  if (state.kind === 'index') {
    try {
      await deleteIndices(connection, names);
      deps.push(
        <Text color="green">
          ✔ Deleted {names.length} {names.length === 1 ? 'index' : 'indices'}:{' '}
          {names.join(', ')}.
        </Text>,
      );
    } catch (error) {
      deps.push(<FailureBlock {...describeFailure(error)} />);
    }
    return;
  }
  await removeEach(state.kind, names, connection, deps);
}

/**
 * Deletes name based resources one by one, reporting each outcome.
 *
 * @param kind - What is being removed.
 * @param names - The confirmed names.
 * @param connection - The live connection.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function removeEach(
  kind: 'alias' | 'template' | 'policy',
  names: string[],
  connection: Connection,
  deps: SessionDeps,
): Promise<void> {
  for (const name of names) {
    try {
      const detail = await removeOne(kind, name, connection);
      deps.push(<Text color="green">✔ {detail}</Text>);
    } catch (error) {
      deps.push(<FailureBlock {...describeFailure(error)} />);
    }
  }
}

/**
 * Deletes one resource and describes the outcome.
 *
 * @param kind - What is being removed.
 * @param name - The resource name.
 * @param connection - The live connection.
 * @returns The confirmation sentence.
 */
async function removeOne(
  kind: 'alias' | 'template' | 'policy',
  name: string,
  connection: Connection,
): Promise<string> {
  if (kind === 'alias') {
    const indices = await deleteAlias(connection, name);
    return `Removed alias "${name}" from: ${indices.join(', ')}.`;
  }
  if (kind === 'template') {
    await deleteTemplate(connection, name);
    return `Template "${name}" deleted.`;
  }
  await deletePolicy(connection, name);
  return `Policy "${name}" deleted.`;
}
