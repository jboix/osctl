// The editor flow: pick a document, edit it in $EDITOR, preview, apply.

import { type EditorResult, editText } from 'inkstand';
import {
  type Connection,
  clusterSettings,
  describeFailure,
  getPolicy,
  getTemplate,
  listAliases,
  listPolicies,
  listTemplates,
} from '../../engine/engine';
import { matchesPattern } from '../../utils/pattern';
import {
  aliasReferenceLines,
  editHeaderLines,
  editSkeleton,
} from './edit-content';
import { buildPreview, type EditTarget, finish } from './edit-preview';
import { type JsoncResult, parseJsonc } from './jsonc';
import { pushFailure, pushLine } from './output';
import type { SessionActions, SessionDeps } from './session-types';

/** The actions of the editor flow. */
type EditActions = Pick<
  SessionActions,
  | 'startEdit'
  | 'startShow'
  | 'pickEditTarget'
  | 'startAliasEdit'
  | 'startClusterSettingsEdit'
  | 'startIndexEdit'
  | 'cancelEdit'
  | 'confirmEdit'
>;

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
    startClusterSettingsEdit: (): void => {
      void openClusterSettingsEditor(deps);
    },
    startIndexEdit: (name): void => {
      void runEditor(
        { kind: 'index', name, body: editSkeleton('index') },
        deps,
      );
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
 * Acts on the named document, or opens the picker without a name. A name
 * containing `*` is resolved as a pattern first.
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
  } else if (name.includes('*')) {
    void resolvePattern(kind, action, name, deps);
  } else if (action === 'show') {
    void showDocument(kind, name, deps);
  } else {
    void openDocument(kind, name, false, deps);
  }
}

/**
 * Resolves a name pattern against the existing documents: a single match acts
 * directly, several open the picker over them, none reports.
 *
 * @param kind - The resource kind.
 * @param action - What to do with the resolved document.
 * @param pattern - The name pattern.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function resolvePattern(
  kind: 'template' | 'policy',
  action: 'apply' | 'show',
  pattern: string,
  deps: SessionDeps,
): Promise<void> {
  const connection = deps.connection;
  if (connection === undefined) {
    return;
  }
  try {
    const names = (await listNames(kind, connection)).filter((name) =>
      matchesPattern(name, pattern),
    );
    const [first] = names;
    if (first === undefined) {
      pushLine(deps, `No ${kind} matches "${pattern}".`, 'yellow');
      return;
    }
    if (names.length === 1) {
      if (action === 'show') {
        await showDocument(kind, first, deps);
      } else {
        await openDocument(kind, first, false, deps);
      }
      return;
    }
    deps.setEditPick({ kind, names, action });
    deps.navigate('/edit/pick');
  } catch (error) {
    pushFailure(deps, describeFailure(error));
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
    const names = await listNames(kind, connection);
    if (action === 'show' && names.length === 0) {
      pushLine(
        deps,
        `No ${kind === 'template' ? 'templates' : 'policies'}.`,
        'dim',
      );
      return;
    }
    deps.setEditPick({ kind, names, action });
    deps.navigate('/edit/pick');
  } catch (error) {
    pushFailure(deps, describeFailure(error));
  }
}

/**
 * Lists the document names of the kind.
 *
 * @param kind - The resource kind.
 * @param connection - The live connection.
 * @returns The names, sorted.
 */
async function listNames(
  kind: 'template' | 'policy',
  connection: Connection,
): Promise<string[]> {
  if (kind === 'template') {
    return (await listTemplates(connection)).map((template) => template.name);
  }
  return (await listPolicies(connection)).map((policy) => policy.name);
}

/**
 * Shows the named document as the foldable block under the scrollback.
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
    if (document === undefined) {
      pushLine(deps, `No ${kind} named "${name}".`, 'yellow');
      return;
    }
    deps.showDoc(`${kind} "${name}"`, JSON.stringify(document, null, 2));
  } catch (error) {
    pushFailure(deps, describeFailure(error));
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
      pushLine(deps, `No ${kind} named "${name}".`, 'yellow');
      close(deps);
      return;
    }
    const base =
      current === undefined ? undefined : JSON.stringify(current, null, 2);
    void runEditor(
      { kind, name, body: base ?? editSkeleton(kind), base },
      deps,
    );
  } catch (error) {
    pushFailure(deps, describeFailure(error));
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
export async function currentDocument(
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
    const aliases = await listAliases(connection);
    void runEditor(
      {
        kind: 'alias',
        body: editSkeleton('alias'),
        reference: aliasReferenceLines(aliases),
        snapshot: JSON.stringify(aliases, null, 2),
      },
      deps,
    );
  } catch (error) {
    pushFailure(deps, describeFailure(error));
  }
}

/**
 * Opens the editor over the current cluster settings.
 *
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function openClusterSettingsEditor(deps: SessionDeps): Promise<void> {
  const connection = deps.connection;
  if (connection === undefined) {
    return;
  }
  try {
    const settings = await clusterSettings(connection);
    const base = JSON.stringify(settings, null, 2);
    void runEditor(
      {
        kind: 'cluster',
        body: base,
        base,
        reference: [
          'Removing a line does not unset a setting: set it to null to unset it.',
        ],
      },
      deps,
    );
  } catch (error) {
    pushFailure(deps, describeFailure(error));
  }
}

/**
 * Runs the editor over the target, parses the result, and opens the preview.
 *
 * @param target - What the editor run works on.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function runEditor(target: EditTarget, deps: SessionDeps): Promise<void> {
  const result = await editText(
    {
      prefix: 'osctl',
      slug: [target.kind, target.name].filter(Boolean).join('-'),
      body: target.body,
      header: editHeaderLines(target.kind, target.name, target.reference)
        .map((line) => `// ${line}`)
        .join('\n'),
      extension: 'jsonc',
    },
    { suspend: deps.suspend, redraw: deps.redraw },
  );
  const parsed = parseJsonc(result.text);
  const abort = abortLine(result, parsed);
  if (abort !== undefined) {
    pushLine(deps, abort.text, abort.tone);
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
 * @returns The abort line, or undefined when the edit goes on to a preview.
 */
function abortLine(
  result: EditorResult,
  parsed: JsoncResult,
): { text: string; tone: 'yellow' | 'dim' } | undefined {
  if (result.error !== undefined) {
    return { text: result.error, tone: 'yellow' };
  }
  if (!result.changed) {
    return { text: 'Edit aborted: the file was not changed.', tone: 'dim' };
  }
  if (parsed.kind === 'empty') {
    return { text: 'Edit aborted: the file is empty.', tone: 'dim' };
  }
  if (parsed.kind === 'error') {
    return {
      text: `${parsed.message} Nothing applied. Your edit is kept at ${result.path}.`,
      tone: 'yellow',
    };
  }
  return undefined;
}
