// The removal flow: indices, aliases, templates, and policies.

import {
  type Connection,
  cancelTask,
  deleteAlias,
  deleteComponent,
  deleteIndices,
  deletePolicy,
  deleteSnapshot,
  deleteTemplate,
  describeFailure,
  ProfileStore,
} from '../../engine/engine';
import { backupStore } from './backup-actions';
import { pushFailure, pushLine } from './output';
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
      if (state !== undefined) {
        dispatchRemove(state, names, deps);
      }
    },
  };
}

/**
 * Routes a confirmed removal to its handler.
 *
 * @param state - The removal being run.
 * @param names - The confirmed names.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function dispatchRemove(
  state: RemoveState,
  names: string[],
  deps: SessionDeps,
): void {
  if (state.kind === 'profile') {
    removeProfiles(names, deps);
    return;
  }
  if (state.kind === 'backup') {
    removeBackups(names, deps);
    return;
  }
  if (deps.connection === undefined) {
    return;
  }
  if (state.kind === 'task') {
    void cancelTasks(names, deps.connection, deps);
    return;
  }
  if (state.kind === 'snapshot') {
    void removeSnapshots(state.repo, names, deps.connection, deps);
    return;
  }
  void finishRemove(state, names, deps.connection, deps);
}

/**
 * Deletes the confirmed snapshots one by one, reporting each outcome.
 *
 * @param repo - The repository holding the snapshots.
 * @param names - The confirmed snapshot names.
 * @param connection - The live connection.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function removeSnapshots(
  repo: string,
  names: string[],
  connection: Connection,
  deps: SessionDeps,
): Promise<void> {
  for (const name of names) {
    try {
      await deleteSnapshot(connection, repo, name);
      pushLine(deps, `✔ Snapshot "${repo}/${name}" deleted.`, 'green');
    } catch (error) {
      pushFailure(deps, describeFailure(error));
    }
  }
}

/**
 * Cancels the confirmed tasks and reports each outcome.
 *
 * @param ids - The confirmed task identifiers.
 * @param connection - The live connection.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function cancelTasks(
  ids: string[],
  connection: Connection,
  deps: SessionDeps,
): Promise<void> {
  for (const id of ids) {
    try {
      await cancelTask(connection, id);
      pushLine(deps, `✔ Cancel of task ${id} requested.`, 'green');
    } catch (error) {
      pushFailure(deps, describeFailure(error));
    }
  }
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
    if (store.remove(name)) {
      pushLine(deps, `✔ Profile "${name}" deleted.`, 'green');
    } else {
      pushLine(deps, `No profile named "${name}".`, 'yellow');
    }
  }
}

/**
 * Deletes the confirmed backups and reports each outcome.
 *
 * @param ids - The confirmed backup identifiers.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function removeBackups(ids: string[], deps: SessionDeps): void {
  const store = backupStore(deps);
  if (store === undefined) {
    pushLine(deps, 'No profile selected. Run /profile add.', 'yellow');
    return;
  }
  for (const id of ids) {
    if (store.remove(id)) {
      pushLine(deps, `✔ Backup deleted: ${id}.`, 'green');
    } else {
      pushLine(deps, `No backup ${id}.`, 'yellow');
    }
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
  state: Exclude<
    RemoveState,
    { kind: 'profile' | 'backup' | 'task' | 'snapshot' }
  >,
  names: string[],
  connection: Connection,
  deps: SessionDeps,
): Promise<void> {
  if (state.kind === 'index') {
    try {
      await deleteIndices(connection, names);
      pushLine(
        deps,
        `✔ Deleted ${names.length} ${names.length === 1 ? 'index' : 'indices'}: ${names.join(', ')}.`,
        'green',
      );
    } catch (error) {
      pushFailure(deps, describeFailure(error));
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
  kind: 'alias' | 'template' | 'component' | 'policy',
  names: string[],
  connection: Connection,
  deps: SessionDeps,
): Promise<void> {
  for (const name of names) {
    try {
      const detail = await removeOne(kind, name, connection);
      pushLine(deps, `✔ ${detail}`, 'green');
    } catch (error) {
      pushFailure(deps, describeFailure(error));
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
  kind: 'alias' | 'template' | 'component' | 'policy',
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
  if (kind === 'component') {
    await deleteComponent(connection, name);
    return `Component template "${name}" deleted.`;
  }
  await deletePolicy(connection, name);
  return `Policy "${name}" deleted.`;
}
