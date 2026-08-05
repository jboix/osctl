// The editor flow content: skeletons, file headers, and alias summaries.

import type { AliasInfo } from '../../engine/engine';
import type { DiffLine } from '../components/line-diff';

/** The resource kinds the editor flow handles. */
export const EDIT_KINDS = ['template', 'policy', 'alias', 'index'] as const;

/** One resource kind of the editor flow. */
export type EditKind = (typeof EDIT_KINDS)[number];

/** The format documentation per kind. */
const DOCS: Record<EditKind, string> = {
  template: 'https://docs.opensearch.org/latest/im-plugin/index-templates/',
  policy: 'https://docs.opensearch.org/latest/im-plugin/ism/policies/',
  alias: 'https://docs.opensearch.org/latest/im-plugin/index-alias/',
  index:
    'https://docs.opensearch.org/latest/api-reference/index-apis/create-index/',
};

/** The minimal valid body per kind, shown when creating a new document. */
const SKELETONS: Record<EditKind, unknown> = {
  template: {
    index_patterns: ['logs-*'],
    priority: 1,
    template: { settings: {}, mappings: {} },
  },
  policy: {
    policy: {
      description: 'New policy',
      default_state: 'hot',
      states: [{ name: 'hot', actions: [], transitions: [] }],
    },
  },
  alias: { actions: [] },
  index: { settings: {}, mappings: {}, aliases: {} },
};

/**
 * Returns the starting body for a new document of the kind.
 *
 * @param kind - The resource kind.
 * @returns The skeleton, pretty printed.
 */
export function editSkeleton(kind: EditKind): string {
  return JSON.stringify(SKELETONS[kind], null, 2);
}

/**
 * Builds the comment header of the edited file.
 *
 * @param kind - The resource kind.
 * @param name - The resource name, when the kind has one.
 * @param extra - Reference lines appended after the instructions.
 * @returns The header lines, without the comment markers.
 */
export function editHeaderLines(
  kind: EditKind,
  name?: string,
  extra: string[] = [],
): string[] {
  const target = name === undefined ? kind : `${kind} "${name}"`;
  return [
    `osctl: edit the ${target}.`,
    `Format: ${DOCS[kind]}`,
    'Lines starting with // are ignored. Save and close to continue.',
    'Empty the file to abort.',
    ...extra,
  ];
}

/** The body of one alias action, as far as the summary reads it. */
interface ActionBody {
  index?: string;
  indices?: string[];
  alias?: string;
  aliases?: string[];
  filter?: unknown;
  is_write_index?: boolean;
}

/**
 * Summarizes alias actions for the preview, one line per action.
 *
 * @param payload - The parsed payload: an actions array, or an object with
 * an `actions` array.
 * @returns The summary lines. Unknown shapes fall back to raw JSON.
 */
export function aliasActionLines(payload: unknown): DiffLine[] {
  const actions = Array.isArray(payload)
    ? payload
    : (payload as { actions?: unknown } | null)?.actions;
  if (!Array.isArray(actions)) {
    return [{ sign: ' ', text: JSON.stringify(payload) }];
  }
  return actions.map(describeAction);
}

/**
 * Describes one alias action.
 *
 * @param action - The action object, for example `{ add: { ... } }`.
 * @returns The summary line: `+` for add, `-` for the remove verbs.
 */
function describeAction(action: unknown): DiffLine {
  const verb = Object.keys(action ?? {})[0];
  if (typeof action !== 'object' || action === null || verb === undefined) {
    return { sign: ' ', text: JSON.stringify(action) };
  }
  const body = (action as Record<string, ActionBody>)[verb] ?? {};
  return { sign: actionSign(verb), text: actionText(verb, body) };
}

/**
 * Maps an action verb to its preview sign.
 *
 * @param verb - The action verb.
 * @returns `+` for add, `-` for the remove verbs, a space otherwise.
 */
function actionSign(verb: string): DiffLine['sign'] {
  if (verb === 'add') {
    return '+';
  }
  return verb === 'remove' || verb === 'remove_index' ? '-' : ' ';
}

/**
 * Renders the text of one action summary line.
 *
 * @param verb - The action verb.
 * @param body - The action body.
 * @returns The summary text.
 */
function actionText(verb: string, body: ActionBody): string {
  const index = body.index ?? body.indices?.join(', ') ?? '?';
  if (verb === 'remove_index') {
    return `remove_index ${index}`;
  }
  const alias = body.alias ?? body.aliases?.join(', ') ?? '?';
  const joiner = verb === 'add' ? 'to' : 'from';
  return `${verb} ${index} ${joiner} ${alias}${actionMarkers(body)}`;
}

/**
 * Renders the filter and write markers of an action.
 *
 * @param body - The action body.
 * @returns The markers, empty when the action has none.
 */
function actionMarkers(body: ActionBody): string {
  const filtered = body.filter === undefined ? '' : ' (filtered)';
  const write = body.is_write_index === true ? ' (write)' : '';
  return `${filtered}${write}`;
}

/**
 * Renders the existing alias names as one reference line for the file
 * header. The targets are left out on purpose: `/alias ls` shows them, and
 * the header stays short.
 *
 * @param aliases - The aliases with their targets.
 * @returns The reference line, empty when there is no alias.
 */
export function aliasReferenceLines(aliases: AliasInfo[]): string[] {
  if (aliases.length === 0) {
    return [];
  }
  return [`Existing aliases: ${aliases.map((alias) => alias.name).join(', ')}`];
}
