// The editor flow: pick a document, edit it in $EDITOR, preview, apply.

import { Text } from 'ink';
import type { ReactNode } from 'react';
import {
  applyAliases,
  applyPolicy,
  applyTemplate,
  type Connection,
  createIndex,
  describeFailure,
  getPolicy,
  getTemplate,
  listAliases,
  listPolicies,
  listTemplates,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import { type DiffLine, diffLines } from '../components/line-diff';
import {
  aliasActionLines,
  aliasReferenceLines,
  type EditKind,
  editHeaderLines,
  editSkeleton,
} from './edit-content';
import { type EditorResult, editText } from './editor';
import { type JsoncResult, parseJsonc } from './jsonc';
import type {
  EditPreviewState,
  SessionActions,
  SessionDeps,
} from './session-types';

/** The actions of the editor flow. */
type EditActions = Pick<
  SessionActions,
  | 'startEdit'
  | 'startShow'
  | 'pickEditTarget'
  | 'startAliasEdit'
  | 'startIndexEdit'
  | 'cancelEdit'
  | 'confirmEdit'
>;

/** What one editor run works on. */
interface EditTarget {
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
}

/**
 * Builds the editor flow actions.
 *
 * @param deps - The session state setters and the navigation.
 * @returns The editor flow actions.
 */
export function createEditActions(deps: SessionDeps): EditActions {
  return {
    startEdit: (kind, name): void => openOrPick(kind, 'apply', name, deps),
    startShow: (kind, name): void => openOrPick(kind, 'show', name, deps),
    pickEditTarget: (name, isNew): void => dispatchPick(name, isNew, deps),
    startAliasEdit: (): void => {
      void openAliasEditor(deps);
    },
    startIndexEdit: (name): void => {
      runEditor({ kind: 'index', name, body: editSkeleton('index') }, deps);
    },
    cancelEdit: (): void => close(deps),
    confirmEdit: (): void => {
      const preview = deps.editPreview;
      close(deps);
      if (preview !== undefined) {
        void finish(preview, deps);
      }
    },
  };
}

/**
 * Acts on the named document, or opens the picker without a name.
 *
 * @param kind - The resource kind.
 * @param action - What to do with the document.
 * @param name - The document name; a picker opens when omitted.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function openOrPick(
  kind: 'template' | 'policy',
  action: 'apply' | 'show',
  name: string | undefined,
  deps: SessionDeps,
): void {
  if (name === undefined) {
    void openPicker(kind, action, deps);
  } else if (action === 'show') {
    void showDocument(kind, name, deps);
  } else {
    void openDocument(kind, name, false, deps);
  }
}

/**
 * Routes a picked document to the action of the open picker.
 *
 * @param name - The picked or newly entered name.
 * @param isNew - Whether the document is new.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function dispatchPick(name: string, isNew: boolean, deps: SessionDeps): void {
  const pick = deps.editPick;
  if (pick === undefined) {
    return;
  }
  if (pick.action === 'show') {
    void showDocument(pick.kind, name, deps);
  } else {
    void openDocument(pick.kind, name, isNew, deps);
  }
}

/**
 * Clears the editor flow state and returns to the prompt.
 *
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function close(deps: SessionDeps): void {
  deps.setEditPick(undefined);
  deps.setEditPreview(undefined);
  deps.navigate('/');
}

/**
 * Loads the document names and opens the picker screen.
 *
 * @param kind - The picked resource kind.
 * @param action - What picking a document does.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function openPicker(
  kind: 'template' | 'policy',
  action: 'apply' | 'show',
  deps: SessionDeps,
): Promise<void> {
  const connection = deps.connection;
  if (connection === undefined) {
    return;
  }
  try {
    const names =
      kind === 'template'
        ? (await listTemplates(connection)).map((template) => template.name)
        : (await listPolicies(connection)).map((policy) => policy.name);
    if (action === 'show' && names.length === 0) {
      deps.push(
        <Text dimColor>
          No {kind === 'template' ? 'templates' : 'policies'}.
        </Text>,
      );
      return;
    }
    deps.setEditPick({ kind, names, action });
    deps.navigate('/edit/pick');
  } catch (error) {
    deps.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Prints the named document, pretty printed.
 *
 * @param kind - The resource kind.
 * @param name - The document name.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function showDocument(
  kind: 'template' | 'policy',
  name: string,
  deps: SessionDeps,
): Promise<void> {
  const connection = deps.connection;
  if (connection === undefined) {
    return;
  }
  close(deps);
  try {
    const document = await currentDocument(kind, name, connection);
    deps.push(
      document === undefined ? (
        <Text color="yellow">
          No {kind} named "{name}".
        </Text>
      ) : (
        <Text>{JSON.stringify(document, null, 2)}</Text>
      ),
    );
  } catch (error) {
    deps.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Loads the picked document and opens the editor over it.
 *
 * @param kind - The resource kind.
 * @param name - The document name.
 * @param isNew - Whether the document is new.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function openDocument(
  kind: 'template' | 'policy',
  name: string,
  isNew: boolean,
  deps: SessionDeps,
): Promise<void> {
  const connection = deps.connection;
  if (connection === undefined) {
    return;
  }
  try {
    const current = isNew
      ? undefined
      : await currentDocument(kind, name, connection);
    if (!isNew && current === undefined) {
      deps.push(
        <Text color="yellow">
          No {kind} named "{name}".
        </Text>,
      );
      close(deps);
      return;
    }
    const base =
      current === undefined ? undefined : JSON.stringify(current, null, 2);
    runEditor({ kind, name, body: base ?? editSkeleton(kind), base }, deps);
  } catch (error) {
    deps.push(<FailureBlock {...describeFailure(error)} />);
    close(deps);
  }
}

/**
 * Reads the current document of the picked kind.
 *
 * @param kind - The resource kind.
 * @param name - The document name.
 * @param connection - The live connection.
 * @returns The document, or undefined when it does not exist.
 */
async function currentDocument(
  kind: 'template' | 'policy',
  name: string,
  connection: Connection,
): Promise<unknown> {
  if (kind === 'template') {
    return getTemplate(connection, name);
  }
  return (await getPolicy(connection, name))?.policy;
}

/**
 * Opens the editor over an alias actions skeleton, with the current aliases
 * as reference comments.
 *
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function openAliasEditor(deps: SessionDeps): Promise<void> {
  const connection = deps.connection;
  if (connection === undefined) {
    return;
  }
  try {
    const reference = aliasReferenceLines(await listAliases(connection));
    runEditor({ kind: 'alias', body: editSkeleton('alias'), reference }, deps);
  } catch (error) {
    deps.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Runs the editor over the target, parses the result, and opens the preview.
 *
 * @param target - What the editor run works on.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function runEditor(target: EditTarget, deps: SessionDeps): void {
  const result = editText(
    [target.kind, target.name].filter(Boolean).join('-'),
    editHeaderLines(target.kind, target.name, target.reference),
    target.body,
    { setRawMode: deps.setRawMode, redraw: deps.redraw },
  );
  const parsed = parseJsonc(result.text);
  const abort = abortBlock(result, parsed);
  if (abort !== undefined) {
    deps.push(abort);
    close(deps);
    return;
  }
  if (parsed.kind === 'ok') {
    deps.setEditPreview(buildPreview(target, parsed.payload));
    deps.navigate('/edit/preview');
  }
}

/**
 * Decides whether an editor run aborts, and with which message.
 *
 * @param result - The editor outcome.
 * @param parsed - The parsed file content.
 * @returns The abort block, or undefined when the edit goes on to a preview.
 */
function abortBlock(
  result: EditorResult,
  parsed: JsoncResult,
): ReactNode | undefined {
  if (result.error !== undefined) {
    return <Text color="yellow">{result.error}</Text>;
  }
  if (!result.changed) {
    return <Text dimColor>Edit aborted: the file was not changed.</Text>;
  }
  if (parsed.kind === 'empty') {
    return <Text dimColor>Edit aborted: the file is empty.</Text>;
  }
  if (parsed.kind === 'error') {
    return (
      <Text color="yellow">
        {parsed.message} Nothing applied. Your edit is kept at {result.path}.
      </Text>
    );
  }
  return undefined;
}

/**
 * Builds the preview of a parsed edit.
 *
 * @param target - What the editor run worked on.
 * @param payload - The parsed payload.
 * @returns The preview: a diff for existing documents, an action summary for
 * aliases, the plain body otherwise.
 */
function buildPreview(target: EditTarget, payload: unknown): EditPreviewState {
  const pretty = JSON.stringify(payload, null, 2);
  return {
    kind: target.kind,
    name: target.name,
    payload,
    title: TITLES[target.kind](target.name ?? ''),
    lines: previewLines(target, pretty, payload),
  };
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
async function finish(
  preview: EditPreviewState,
  deps: SessionDeps,
): Promise<void> {
  const connection = deps.connection;
  if (connection === undefined) {
    return;
  }
  try {
    deps.push(await applyEdit(preview, connection));
  } catch (error) {
    deps.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Applies one edit to the cluster.
 *
 * @param preview - The confirmed edit.
 * @param connection - The live connection.
 * @returns The confirmation block.
 */
async function applyEdit(
  preview: EditPreviewState,
  connection: Connection,
): Promise<ReactNode> {
  const name = preview.name ?? '';
  switch (preview.kind) {
    case 'template':
      await applyTemplate(connection, name, preview.payload);
      return (
        <Text color="green">
          ✔ Template "{name}" saved. Existing indices keep their settings until
          a rollover.
        </Text>
      );
    case 'policy': {
      const outcome = await applyPolicy(connection, name, preview.payload);
      return (
        <Text color="green">
          ✔ Policy "{name}" {outcome}.
        </Text>
      );
    }
    case 'alias': {
      const count = await applyAliases(connection, preview.payload);
      return (
        <Text color="green">
          ✔ Applied {count} alias action{count === 1 ? '' : 's'}.
        </Text>
      );
    }
    case 'index':
      await createIndex(connection, name, preview.payload);
      return <Text color="green">✔ Index "{name}" created.</Text>;
  }
}
