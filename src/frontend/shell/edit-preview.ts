// Builds the preview of an edit and applies it after confirmation.

import {
  applyAliases,
  applyPolicy,
  applyTemplate,
  BackupStore,
  type Connection,
  createIndex,
  describeFailure,
} from '../../engine/engine';
import { type DiffLine, diffLines } from '../components/line-diff';
import { aliasActionLines, type EditKind } from './edit-content';
import { pushFailure, pushLine } from './output';
import type { EditPreviewState, SessionDeps } from './session-types';

/** What one editor run works on. */
export interface EditTarget {
  /** The resource kind. */
  kind: EditKind;
  /** The document name, absent for alias actions. */
  name?: string;
  /** The starting body the editor opens on. */
  body: string;
  /** The current document body; its presence turns the preview into a diff. */
  base?: string;
  /** Reference lines appended to the file header. */
  reference?: string[];
  /** The current alias table, backed up when alias actions are applied. */
  snapshot?: string;
}

/**
 * Builds the preview of a parsed edit.
 *
 * @param target - What the editor run worked on.
 * @param payload - The parsed payload.
 * @returns The preview: a diff for existing documents, an action summary for
 * aliases, the plain body otherwise.
 */
export function buildPreview(
  target: EditTarget,
  payload: unknown,
): EditPreviewState {
  const pretty = JSON.stringify(payload, null, 2);
  return {
    kind: target.kind,
    name: target.name,
    payload,
    title: TITLES[target.kind](target.name ?? ''),
    lines: previewLines(target, pretty, payload),
    backup: previewBackup(target),
  };
}

/**
 * Decides what the apply backs up: the overwritten document for templates and
 * policies, the alias table snapshot for alias actions.
 *
 * @param target - What the editor run worked on.
 * @returns The backup, or undefined when nothing is overwritten.
 */
function previewBackup(target: EditTarget): EditPreviewState['backup'] {
  if (target.kind === 'alias' && target.snapshot !== undefined) {
    return { type: 'alias', name: 'aliases', body: target.snapshot };
  }
  if (
    (target.kind === 'template' || target.kind === 'policy') &&
    target.base !== undefined &&
    target.name !== undefined
  ) {
    return { type: target.kind, name: target.name, body: target.base };
  }
  return undefined;
}

/** The confirmation title per kind. */
const TITLES: Record<EditKind, (name: string) => string> = {
  template: (name) => `Save template "${name}"?`,
  policy: (name) => `Save policy "${name}"?`,
  alias: () => 'Apply these alias actions?',
  index: (name) => `Create index "${name}"?`,
};

/**
 * Renders the preview lines of a parsed edit.
 *
 * @param target - What the editor run worked on.
 * @param pretty - The payload, pretty printed.
 * @param payload - The parsed payload.
 * @returns The preview lines.
 */
function previewLines(
  target: EditTarget,
  pretty: string,
  payload: unknown,
): DiffLine[] {
  if (target.kind === 'alias') {
    return aliasActionLines(payload);
  }
  if (target.base !== undefined) {
    const diff = diffLines(target.base, pretty);
    return diff.length === 0 ? [{ sign: ' ', text: '(no changes)' }] : diff;
  }
  const sign = target.kind === 'index' ? ' ' : '+';
  return pretty.split('\n').map((text) => ({ sign, text }));
}

/**
 * Applies the confirmed edit and reports the outcome.
 *
 * @param preview - The confirmed edit.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
export async function finish(
  preview: EditPreviewState,
  deps: SessionDeps,
): Promise<void> {
  const connection = deps.connection;
  if (connection === undefined) {
    return;
  }
  if (!writeBackup(preview, connection, deps)) {
    return;
  }
  try {
    pushLine(deps, await applyEdit(preview, connection), 'green');
  } catch (error) {
    pushFailure(deps, describeFailure(error));
  }
}

/**
 * Writes the backup of a confirmed edit. A failed write aborts the apply,
 * because applying without the backup would break the restore guarantee.
 *
 * @param preview - The confirmed edit.
 * @param connection - The live connection, naming the profile.
 * @param deps - The session state setters and the navigation.
 * @returns Whether the apply may proceed.
 */
function writeBackup(
  preview: EditPreviewState,
  connection: Connection,
  deps: SessionDeps,
): boolean {
  if (preview.backup === undefined) {
    return true;
  }
  try {
    const store = new BackupStore(connection.profile.name);
    store.save(preview.backup.type, preview.backup.name, preview.backup.body);
    return true;
  } catch (error) {
    pushLine(
      deps,
      `Backup failed: ${(error as Error).message}. Nothing applied.`,
      'yellow',
    );
    return false;
  }
}

/**
 * Applies one edit to the cluster.
 *
 * @param preview - The confirmed edit.
 * @param connection - The live connection.
 * @returns The confirmation line.
 */
async function applyEdit(
  preview: EditPreviewState,
  connection: Connection,
): Promise<string> {
  const name = preview.name ?? '';
  switch (preview.kind) {
    case 'template':
      await applyTemplate(connection, name, preview.payload);
      return `✔ Template "${name}" saved. Existing indices keep their settings until a rollover.`;
    case 'policy': {
      const outcome = await applyPolicy(connection, name, preview.payload);
      return `✔ Policy "${name}" ${outcome}.`;
    }
    case 'alias': {
      const count = await applyAliases(connection, preview.payload);
      return `✔ Applied ${count} alias action${count === 1 ? '' : 's'}.`;
    }
    case 'index':
      await createIndex(connection, name, preview.payload);
      return `✔ Index "${name}" created.`;
  }
}
