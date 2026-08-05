// The ISM policy queries.

import type { Connection } from '../connection/connection';

/** One policy row of /policy ls. */
export interface PolicyInfo {
  /** The policy name. */
  name: string;
  /** The policy description. */
  description?: string;
  /** The state the policy starts in. */
  defaultState?: string;
  /** The state names, in policy order. */
  states: string[];
}

/** One policy with its concurrency metadata. */
export interface PolicyDocument {
  /** The policy definition, as stored. */
  policy: unknown;
  /** The sequence number for a safe update. */
  seqNo: number;
  /** The primary term for a safe update. */
  primaryTerm: number;
}

/** One index row of /policy explain. */
export interface ExplainRow {
  /** The index name. */
  index: string;
  /** The managing policy, when the index is managed. */
  policyId?: string;
  /** The current state. */
  state?: string;
  /** The running action. */
  action?: string;
  /** The last message of the management run. */
  info?: string;
}

/**
 * Lists the ISM policies.
 *
 * @param connection - The live connection.
 * @returns The policies sorted by name.
 */
export async function listPolicies(
  connection: Connection,
): Promise<PolicyInfo[]> {
  const response = await connection.client.ism.getPolicies();
  const body = response.body as { policies?: PolicyEntry[] };
  return (body.policies ?? [])
    .map((entry) => ({
      name: entry._id,
      description: entry.policy.description,
      defaultState: entry.policy.default_state,
      states: (entry.policy.states ?? []).map((state) => state.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One entry of the getPolicies response. */
interface PolicyEntry {
  _id: string;
  _seq_no: number;
  _primary_term: number;
  policy: {
    description?: string;
    default_state?: string;
    states?: { name: string }[];
  };
}

/**
 * Reads one policy with its concurrency metadata.
 *
 * @param connection - The live connection.
 * @param name - The policy name.
 * @returns The policy document, or undefined when the policy is missing.
 */
export async function getPolicy(
  connection: Connection,
  name: string,
): Promise<PolicyDocument | undefined> {
  try {
    const response = await connection.client.ism.getPolicy({ policy_id: name });
    const body = response.body as {
      _seq_no: number;
      _primary_term: number;
      policy: unknown;
    };
    return {
      policy: body.policy,
      seqNo: body._seq_no,
      primaryTerm: body._primary_term,
    };
  } catch (error) {
    if (statusOf(error) === 404) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Reads the status code of a client error.
 *
 * @param error - The thrown value.
 * @returns The status code, when the error carries one.
 */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  return (error as { meta?: { statusCode?: number } }).meta?.statusCode;
}

/**
 * Explains the ISM state of the indices matching the pattern.
 *
 * @param connection - The live connection.
 * @param pattern - An index name or pattern; all indices when omitted.
 * @returns The rows sorted by index name.
 */
export async function explainIsm(
  connection: Connection,
  pattern?: string,
): Promise<ExplainRow[]> {
  const response = await connection.client.ism.explainPolicy({
    index: pattern ?? '*',
  });
  const body = response.body as Record<string, ExplainEntry | number>;
  return Object.entries(body)
    .filter(
      (pair): pair is [string, ExplainEntry] => typeof pair[1] === 'object',
    )
    .map(([index, entry]) => ({
      index,
      policyId: entry.policy_id ?? undefined,
      state: entry.state?.name,
      action: entry.action?.name,
      info: entry.info?.message,
    }))
    .sort((a, b) => a.index.localeCompare(b.index));
}

/** One index entry of the explain response. */
interface ExplainEntry {
  policy_id?: string | null;
  state?: { name?: string };
  action?: { name?: string };
  info?: { message?: string };
}
