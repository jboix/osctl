// The /template command runners.

import { describeFailure, listTemplates } from '../../engine/engine';
import { Table, type TableProps, tableLines } from '../components/table';
import type { CommandContext } from './command-types';
import { matchesPattern, requireConnection } from './command-utils';
import { pushFailure, pushLine } from './output';

/**
 * Lists the index templates as a table block.
 *
 * @param context - What the command can act on.
 * @param pattern - A template name or pattern; all templates when omitted.
 * @returns Nothing.
 */
export async function runTemplateLs(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const templates = (await listTemplates(connection)).filter((template) =>
      matchesPattern(template.name, pattern),
    );
    if (templates.length === 0) {
      pushLine(context.session, 'No templates match.', 'dim');
      return;
    }
    const table: TableProps = {
      columns: [
        { label: 'template' },
        { label: 'patterns' },
        { label: 'priority', alignRight: true },
        { label: 'version', alignRight: true },
      ],
      rows: templates.map((template) => [
        template.name,
        template.patterns.join(', '),
        template.priority === undefined ? '' : String(template.priority),
        template.version === undefined ? '' : String(template.version),
      ]),
    };
    context.session.push(<Table {...table} />, {
      label: 'the template list',
      text: tableLines(table).join('\n'),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Shows the named template, or opens the picker without a name.
 *
 * @param context - What the command can act on.
 * @param name - The template name; a picker opens when omitted.
 * @returns Nothing.
 */
export function runTemplateShow(context: CommandContext, name?: string): void {
  if (requireConnection(context) !== undefined) {
    context.session.startShow('template', name);
  }
}

/**
 * Edits the named template, or opens the picker without a name.
 *
 * @param context - What the command can act on.
 * @param name - The template name; a picker opens when omitted.
 * @returns Nothing.
 */
export function runTemplateApply(context: CommandContext, name?: string): void {
  if (requireConnection(context) !== undefined) {
    context.session.startEdit('template', name);
  }
}

/**
 * Opens the deletion screen for the templates matching the pattern.
 *
 * @param context - What the command can act on.
 * @param pattern - A template name or pattern; all templates when omitted.
 * @returns Nothing.
 */
export async function runTemplateRm(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const templates = (await listTemplates(connection)).filter((template) =>
      matchesPattern(template.name, pattern),
    );
    if (templates.length === 0) {
      pushLine(context.session, 'No templates match.', 'dim');
      return;
    }
    context.session.startRemove({
      kind: 'template',
      items: templates.map((template) => ({
        label: `${template.name.padEnd(28)} ${template.patterns.join(', ')}`,
        value: template.name,
      })),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}
