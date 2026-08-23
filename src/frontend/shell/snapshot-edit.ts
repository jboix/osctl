// The snapshot editor flows: the create body and the restore body.

import { describeFailure, getSnapshot } from '../../engine/engine';
import { editSkeleton } from './edit-content';
import { runEditor } from './edit-runner';
import { pushFailure, pushLine } from './output';
import type { SessionDeps } from './session-types';

/**
 * Opens the editor over the body of a new snapshot.
 *
 * @param repo - The repository name.
 * @param name - The snapshot name.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
export function openSnapshotEditor(
  repo: string,
  name: string,
  deps: SessionDeps,
): void {
  void runEditor(
    {
      kind: 'snapshot',
      name,
      repo,
      body: editSkeleton('snapshot'),
      reference: ['The snapshot runs in the background once confirmed.'],
    },
    deps,
  );
}

/**
 * Opens the editor over the restore body of one snapshot, after checking
 * that the snapshot exists.
 *
 * @param repo - The repository name.
 * @param name - The snapshot name.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
export async function openRestoreEditor(
  repo: string,
  name: string,
  deps: SessionDeps,
): Promise<void> {
  const connection = deps.connection;
  if (connection === undefined) {
    return;
  }
  try {
    const snapshot = await getSnapshot(connection, repo, name);
    if (snapshot === undefined) {
      pushLine(deps, `No snapshot "${repo}/${name}".`, 'yellow');
      return;
    }
    void runEditor(
      {
        kind: 'restore',
        name,
        repo,
        body: editSkeleton('restore'),
        reference: [
          'Open indices cannot be overwritten: close or rename them first.',
          'Use rename_pattern and rename_replacement to restore under new names.',
        ],
      },
      deps,
    );
  } catch (error) {
    pushFailure(deps, describeFailure(error));
  }
}
