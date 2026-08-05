// The /template command flows: apply and remove.

import { Text } from 'ink';
import {
  applyTemplate,
  deleteTemplate,
  describeFailure,
  type TemplateInfo,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import type { SessionActions, SessionDeps } from './session-types';

/**
 * Builds the /template actions.
 *
 * @param deps - The session state setters and the navigation.
 * @returns The template actions.
 */
export function createTemplateActions(
  deps: SessionDeps,
): Pick<
  SessionActions,
  | 'startTemplateApply'
  | 'cancelTemplateApply'
  | 'executeTemplateApply'
  | 'startTemplateRm'
  | 'cancelTemplateRm'
  | 'executeTemplateRm'
> {
  return {
    startTemplateApply: (name: string): void => {
      deps.setTemplateApplyState(name);
      deps.navigate('/template/apply');
    },
    cancelTemplateApply: (): void => {
      deps.setTemplateApplyState(undefined);
      deps.navigate('/');
    },
    executeTemplateApply: (payload: unknown): void => {
      const name = deps.templateApplyState;
      deps.setTemplateApplyState(undefined);
      deps.navigate('/');
      if (name !== undefined) {
        void finishTemplateApply(name, payload, deps);
      }
    },
    startTemplateRm: (targets: TemplateInfo[]): void => {
      deps.setTemplateRmState(targets);
      deps.navigate('/template/rm');
    },
    cancelTemplateRm: (): void => {
      deps.setTemplateRmState(undefined);
      deps.navigate('/');
    },
    executeTemplateRm: (names: string[]): void => {
      deps.setTemplateRmState(undefined);
      deps.navigate('/');
      void finishTemplateRm(names, deps);
    },
  };
}

/**
 * Saves the confirmed template and reports the outcome.
 *
 * @param name - The template name.
 * @param payload - The parsed JSON template definition.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function finishTemplateApply(
  name: string,
  payload: unknown,
  deps: SessionDeps,
): Promise<void> {
  if (deps.connection === undefined) {
    return;
  }
  try {
    await applyTemplate(deps.connection, name, payload);
    deps.push(<Text color="green">✔ Template "{name}" saved.</Text>);
    deps.push(
      <Text dimColor>
        Existing indices are unaffected until the next rollover.
      </Text>,
    );
  } catch (error) {
    deps.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Deletes the confirmed templates and reports each outcome.
 *
 * @param names - The template names.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function finishTemplateRm(
  names: string[],
  deps: SessionDeps,
): Promise<void> {
  if (deps.connection === undefined) {
    return;
  }
  for (const name of names) {
    try {
      await deleteTemplate(deps.connection, name);
      deps.push(<Text color="green">✔ Template "{name}" deleted.</Text>);
    } catch (error) {
      deps.push(<FailureBlock {...describeFailure(error)} />);
    }
  }
}
