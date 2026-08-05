// The /template command runners.

import { Text } from 'ink';
import {
  describeFailure,
  getTemplate,
  listTemplates,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import { Table } from '../components/table';
import type { CommandContext } from './command-types';
import { matchesPattern, requireConnection } from './command-utils';

/**
 * Lists the index templates as a table block.
 *
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export async function runTemplateLs(context: CommandContext): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const templates = await listTemplates(connection);
    context.session.push(
      templates.length === 0 ? (
        <Text dimColor>No templates.</Text>
      ) : (
        <Table
          columns={[
            { label: 'template' },
            { label: 'patterns' },
            { label: 'priority', alignRight: true },
            { label: 'version', alignRight: true },
          ]}
          rows={templates.map((template) => [
            template.name,
            template.patterns.join(', '),
            template.priority === undefined ? '' : String(template.priority),
            template.version === undefined ? '' : String(template.version),
          ])}
        />
      ),
    );
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Prints one template, pretty printed.
 *
 * @param context - What the command can act on.
 * @param name - The template name.
 * @returns Nothing.
 */
export async function runTemplateShow(
  context: CommandContext,
  name?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  if (name === undefined) {
    context.session.push(
      <Text color="yellow">Usage: /template show {'<name>'}.</Text>,
    );
    return;
  }
  try {
    const template = await getTemplate(connection, name);
    context.session.push(
      template === undefined ? (
        <Text color="yellow">No template named "{name}".</Text>
      ) : (
        <Text>{JSON.stringify(template, null, 2)}</Text>
      ),
    );
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Opens the JSON input for the named template.
 *
 * @param context - What the command can act on.
 * @param name - The template name.
 * @returns Nothing.
 */
export async function runTemplateApply(
  context: CommandContext,
  name?: string,
): Promise<void> {
  if (requireConnection(context) === undefined) {
    return;
  }
  if (name === undefined) {
    context.session.push(
      <Text color="yellow">Usage: /template apply {'<name>'}.</Text>,
    );
    return;
  }
  context.session.startApply({ kind: 'template', name });
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
      context.session.push(<Text dimColor>No templates match.</Text>);
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
    context.session.push(<FailureBlock {...describeFailure(error)} />);
  }
}
