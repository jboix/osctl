// Runs the external editor over one target and opens the preview.

import { type EditorResult, editText } from 'inkstand';
import { editHeaderLines } from './edit-content';
import { buildPreview, type EditTarget } from './edit-preview';
import { type JsoncResult, parseJsonc } from './jsonc';
import { pushLine } from './output';
import type { SessionDeps } from './session-types';

/**
 * Clears the editor flow state and returns to the prompt.
 *
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
export function closeEdit(deps: SessionDeps): void {
  deps.setEditPick(undefined);
  deps.setEditPreview(undefined);
  deps.navigate('/');
}

/**
 * Runs the editor over the target, parses the result, and opens the preview.
 *
 * @param target - What the editor run works on.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
export async function runEditor(
  target: EditTarget,
  deps: SessionDeps,
): Promise<void> {
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
    closeEdit(deps);
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
