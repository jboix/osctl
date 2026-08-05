// The /alias command flows: apply and remove.

import { Text } from 'ink';
import {
  type AliasInfo,
  applyAliases,
  deleteAlias,
  describeFailure,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import type { SessionActions, SessionDeps } from './session-types';

/**
 * Builds the /alias rm actions.
 *
 * @param deps - The session state setters and the navigation.
 * @returns The alias actions.
 */
export function createAliasActions(
  deps: SessionDeps,
): Pick<
  SessionActions,
  | 'startAliasApply'
  | 'cancelAliasApply'
  | 'executeAliasApply'
  | 'startAliasRm'
  | 'cancelAliasRm'
  | 'executeAliasRm'
> {
  return {
    startAliasApply: (): void => deps.navigate('/alias/apply'),
    cancelAliasApply: (): void => deps.navigate('/'),
    executeAliasApply: (payload: unknown): void => {
      deps.navigate('/');
      void finishAliasApply(payload, deps);
    },
    startAliasRm: (targets: AliasInfo[]): void => {
      deps.setAliasRmState(targets);
      deps.navigate('/alias/rm');
    },
    cancelAliasRm: (): void => {
      deps.setAliasRmState(undefined);
      deps.navigate('/');
    },
    executeAliasRm: (names: string[]): void => {
      deps.setAliasRmState(undefined);
      deps.navigate('/');
      void finishAliasRm(names, deps);
    },
  };
}

/**
 * Applies the confirmed alias actions and reports the outcome.
 *
 * @param payload - The parsed JSON payload.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function finishAliasApply(
  payload: unknown,
  deps: SessionDeps,
): Promise<void> {
  if (deps.connection === undefined) {
    return;
  }
  try {
    const applied = await applyAliases(deps.connection, payload);
    deps.push(
      <Text color="green">
        ✔ Applied {applied} alias {applied === 1 ? 'action' : 'actions'}.
      </Text>,
    );
  } catch (error) {
    deps.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Removes the confirmed aliases and reports each outcome.
 *
 * @param names - The alias names.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function finishAliasRm(
  names: string[],
  deps: SessionDeps,
): Promise<void> {
  if (deps.connection === undefined) {
    return;
  }
  for (const name of names) {
    try {
      const indices = await deleteAlias(deps.connection, name);
      deps.push(
        <Text color="green">
          ✔ Removed alias "{name}" from: {indices.join(', ')}.
        </Text>,
      );
    } catch (error) {
      deps.push(<FailureBlock {...describeFailure(error)} />);
    }
  }
}
