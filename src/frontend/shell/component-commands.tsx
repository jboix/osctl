// The /component command runners.

import { Table, type TableProps, tableText } from 'inkstand';
import { describeFailure, listComponents } from '../../engine/engine';
import { matchesPattern } from '../../utils/pattern';
import type { CommandContext } from './command-types';
import { requireConnection } from './command-utils';
import { pushFailure, pushLine } from './output';

/**
 * Lists the component templates as a table block.
 *
 * @param context - What the command can act on.
 * @param pattern - A component template name or pattern; all when omitted.
 * @returns Nothing.
 */
export async function runComponentLs(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const components = (await listComponents(connection)).filter((component) =>
      matchesPattern(component.name, pattern),
    );
    if (components.length === 0) {
      pushLine(context.session, 'No component templates match.', 'dim');
      return;
    }
    const table: TableProps = {
      columns: [{ label: 'component' }, { label: 'version', alignRight: true }],
      rows: components.map((component) => [
        component.name,
        component.version === undefined ? '' : String(component.version),
      ]),
    };
    context.session.push(<Table {...table} />, {
      label: 'the component template list',
      text: tableText(table),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Shows the named component template, or opens the picker without a name.
 *
 * @param context - What the command can act on.
 * @param name - The component template name; a picker opens when omitted.
 * @returns Nothing.
 */
export function runComponentShow(context: CommandContext, name?: string): void {
  if (requireConnection(context) !== undefined) {
    context.session.startShow('component', name);
  }
}

/**
 * Edits the named component template, or opens the picker without a name.
 *
 * @param context - What the command can act on.
 * @param name - The component template name; a picker opens when omitted.
 * @returns Nothing.
 */
export function runComponentApply(
  context: CommandContext,
  name?: string,
): void {
  if (requireConnection(context) !== undefined) {
    context.session.startEdit('component', name);
  }
}

/**
 * Opens the deletion screen for the component templates matching the pattern.
 *
 * @param context - What the command can act on.
 * @param pattern - A component template name or pattern; all when omitted.
 * @returns Nothing.
 */
export async function runComponentRm(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const components = (await listComponents(connection)).filter((component) =>
      matchesPattern(component.name, pattern),
    );
    if (components.length === 0) {
      pushLine(context.session, 'No component templates match.', 'dim');
      return;
    }
    context.session.startRemove({
      kind: 'component',
      items: components.map((component) => ({
        label: component.name,
        value: component.name,
      })),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}
