// The /policy command runners.

import { describeFailure, explainIsm, listPolicies } from '../../engine/engine';
import { Table, type TableProps, tableLines } from '../components/table';
import type { CommandContext } from './command-types';
import { matchesPattern, requireConnection } from './command-utils';
import { pushFailure, pushLine } from './output';

/**
 * Lists the ISM policies as a table block.
 *
 * @param context - What the command can act on.
 * @param pattern - A policy name or pattern; all policies when omitted.
 * @returns Nothing.
 */
export async function runPolicyLs(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const policies = (await listPolicies(connection)).filter((policy) =>
      matchesPattern(policy.name, pattern),
    );
    if (policies.length === 0) {
      pushLine(context.session, 'No policies match.', 'dim');
      return;
    }
    const table: TableProps = {
      columns: [
        { label: 'policy' },
        { label: 'states' },
        { label: 'description' },
      ],
      rows: policies.map((policy) => [
        policy.name,
        policy.states.join(', '),
        policy.description ?? '',
      ]),
    };
    context.session.push(<Table {...table} />, {
      label: 'the policy list',
      text: tableLines(table).join('\n'),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Shows the named policy, or opens the picker without a name.
 *
 * @param context - What the command can act on.
 * @param name - The policy name; a picker opens when omitted.
 * @returns Nothing.
 */
export function runPolicyShow(context: CommandContext, name?: string): void {
  if (requireConnection(context) !== undefined) {
    context.session.startShow('policy', name);
  }
}

/**
 * Edits the named policy, or opens the picker without a name.
 *
 * @param context - What the command can act on.
 * @param name - The policy name; a picker opens when omitted.
 * @returns Nothing.
 */
export function runPolicyApply(context: CommandContext, name?: string): void {
  if (requireConnection(context) !== undefined) {
    context.session.startEdit('policy', name);
  }
}

/**
 * Opens the deletion screen for the policies matching the pattern.
 *
 * @param context - What the command can act on.
 * @param pattern - A policy name or pattern; all policies when omitted.
 * @returns Nothing.
 */
export async function runPolicyRm(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const policies = (await listPolicies(connection)).filter((policy) =>
      matchesPattern(policy.name, pattern),
    );
    if (policies.length === 0) {
      pushLine(context.session, 'No policies match.', 'dim');
      return;
    }
    context.session.startRemove({
      kind: 'policy',
      items: policies.map((policy) => ({
        label: `${policy.name.padEnd(28)} ${policy.states.join(', ')}`,
        value: policy.name,
      })),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Shows the ISM state of the indices matching the pattern.
 *
 * @param context - What the command can act on.
 * @param pattern - An index name or pattern; all indices when omitted.
 * @returns Nothing.
 */
export async function runPolicyExplain(
  context: CommandContext,
  pattern?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const rows = await explainIsm(connection, pattern);
    if (rows.length === 0) {
      pushLine(context.session, 'No indices match.', 'dim');
      return;
    }
    const table: TableProps = {
      columns: [
        { label: 'index' },
        { label: 'policy' },
        { label: 'state' },
        { label: 'action' },
        { label: 'info' },
      ],
      rows: rows.map((row) => [
        row.index,
        row.policyId ?? '',
        row.state ?? '',
        row.action ?? '',
        row.info ?? '',
      ]),
    };
    context.session.push(<Table {...table} />, {
      label: 'the ISM report',
      text: tableLines(table).join('\n'),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}
