// The /index command flows: deletion.

import { Text } from 'ink';
import {
  deleteIndices,
  describeFailure,
  type IndexInfo,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import type { SessionActions, SessionDeps } from './session-types';

/**
 * Builds the /index rm actions.
 *
 * @param deps - The session state setters and the navigation.
 * @returns The index actions.
 */
export function createIndexActions(
  deps: SessionDeps,
): Pick<SessionActions, 'startIndexRm' | 'cancelIndexRm' | 'executeIndexRm'> {
  return {
    startIndexRm: (targets: IndexInfo[]): void => {
      deps.setRmState(targets);
      deps.navigate('/index/rm');
    },
    cancelIndexRm: (): void => {
      deps.setRmState(undefined);
      deps.navigate('/');
    },
    executeIndexRm: (names: string[]): void => {
      deps.setRmState(undefined);
      deps.navigate('/');
      void finishIndexRm(names, deps);
    },
  };
}

/**
 * Deletes the confirmed indices and reports the outcome.
 *
 * @param names - The index names to delete.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function finishIndexRm(
  names: string[],
  deps: SessionDeps,
): Promise<void> {
  if (deps.connection === undefined) {
    return;
  }
  try {
    await deleteIndices(deps.connection, names);
    deps.push(
      <Text color="green">
        ✔ Deleted {names.length} {names.length === 1 ? 'index' : 'indices'}:{' '}
        {names.join(', ')}.
      </Text>,
    );
  } catch (error) {
    deps.push(<FailureBlock {...describeFailure(error)} />);
  }
}
