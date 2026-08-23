// The pickable kinds: their nouns, titles, names, and document access.

import {
  type Connection,
  getComponent,
  getIndex,
  getIndexSettings,
  getPolicy,
  getTemplate,
  listComponents,
  listIndices,
  listPolicies,
  listTemplates,
} from '../../engine/engine';
import type { PickKind } from './session-types';

/** The plural noun per pickable kind. */
export const PLURALS: Record<PickKind, string> = {
  template: 'templates',
  component: 'component templates',
  policy: 'policies',
  index: 'indices',
  'index-settings': 'indices',
};

/** The singular noun per pickable kind, used in messages. */
export const NOUNS: Record<PickKind, string> = {
  template: 'template',
  component: 'component template',
  policy: 'policy',
  index: 'index',
  'index-settings': 'index',
};

/** The document block title prefix per pickable kind. */
export const DOC_TITLES: Record<PickKind, string> = {
  template: 'template',
  component: 'component template',
  policy: 'policy',
  index: 'index',
  'index-settings': 'settings of index',
};

/**
 * Decides whether the picker offers the new document entry. Only templates,
 * component templates, and policies can be created from the picker.
 *
 * @param kind - The picked resource kind.
 * @param action - What picking a document does.
 * @returns Whether the new entry is offered.
 */
export function offersNew(kind: PickKind, action: 'apply' | 'show'): boolean {
  return (
    action === 'apply' &&
    (kind === 'template' || kind === 'component' || kind === 'policy')
  );
}

/**
 * Lists the document names of the kind.
 *
 * @param kind - The resource kind.
 * @param connection - The live connection.
 * @returns The names, sorted.
 */
export async function listNames(
  kind: PickKind,
  connection: Connection,
): Promise<string[]> {
  if (kind === 'template') {
    return (await listTemplates(connection)).map((template) => template.name);
  }
  if (kind === 'component') {
    return (await listComponents(connection)).map(
      (component) => component.name,
    );
  }
  if (kind === 'policy') {
    return (await listPolicies(connection)).map((policy) => policy.name);
  }
  return (await listIndices(connection)).map((index) => index.name);
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
  kind: PickKind,
  name: string,
  connection: Connection,
): Promise<unknown> {
  if (kind === 'template') {
    return getTemplate(connection, name);
  }
  if (kind === 'component') {
    return getComponent(connection, name);
  }
  if (kind === 'index') {
    return getIndex(connection, name);
  }
  if (kind === 'index-settings') {
    return getIndexSettings(connection, name);
  }
  return (await getPolicy(connection, name))?.policy;
}
