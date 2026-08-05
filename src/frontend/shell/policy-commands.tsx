// The /policy command runners.

import { Text } from 'ink';
import {
  describeFailure,
  explainIsm,
  getPolicy,
  listPolicies,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import { Table } from '../components/table';
import type { CommandContext } from './command-types';
import { matchesPattern, requireConnection } from './command-utils';

/**
 * Lists the ISM policies as a table block.
 *
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export async function runPolicyLs(context: CommandContext): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const policies = await listPolicies(connection);
    context.session.push(
      policies.length === 0 ? (
        <Text dimColor>No policies.</Text>
      ) : (
        <Table
          columns={[
            { label: 'policy' },
            { label: 'states' },
            { label: 'description' },
          ]}
          rows={policies.map((policy) => [
            policy.name,
            policy.states.join(', '),
            policy.description ?? '',
          ])}
        />
      ),
    );
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Prints one policy, pretty printed.
 *
 * @param context - What the command can act on.
 * @param name - The policy name.
 * @returns Nothing.
 */
export async function runPolicyShow(
  context: CommandContext,
  name?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  if (name === undefined) {
    context.session.push(
      <Text color="yellow">Usage: /policy show {'<name>'}.</Text>,
    );
    return;
  }
  try {
    const document = await getPolicy(connection, name);
    context.session.push(
      document === undefined ? (
        <Text color="yellow">No policy named "{name}".</Text>
      ) : (
        <Text>{JSON.stringify(document.policy, null, 2)}</Text>
      ),
    );
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Opens the JSON input for the named policy.
 *
 * @param context - What the command can act on.
 * @param name - The policy name.
 * @returns Nothing.
 */
export async function runPolicyApply(
  context: CommandContext,
  name?: string,
): Promise<void> {
  if (requireConnection(context) === undefined) {
    return;
  }
  if (name === undefined) {
    context.session.push(
      <Text color="yellow">Usage: /policy apply {'<name>'}.</Text>,
    );
    return;
  }
  context.session.startApply({ kind: 'policy', name });
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
      context.session.push(<Text dimColor>No policies match.</Text>);
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
    context.session.push(<FailureBlock {...describeFailure(error)} />);
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
    context.session.push(
      rows.length === 0 ? (
        <Text dimColor>No indices match.</Text>
      ) : (
        <Table
          columns={[
            { label: 'index' },
            { label: 'policy' },
            { label: 'state' },
            { label: 'action' },
            { label: 'info' },
          ]}
          rows={rows.map((row) => [
            row.index,
            row.policyId ?? '',
            row.state ?? '',
            row.action ?? '',
            row.info ?? '',
          ])}
        />
      ),
    );
  } catch (error) {
    context.session.push(<FailureBlock {...describeFailure(error)} />);
  }
}
