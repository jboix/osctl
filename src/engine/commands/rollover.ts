// The rollover command: rolls over a write alias and carries its aliases.

import type { Connection } from '../connection/connection';

/** The outcome of a rollover. */
export interface RolloverResult {
  /** The index that was rolled over. */
  oldIndex: string;
  /** The new head index. */
  newIndex: string;
  /** The alias names copied to the new head. */
  reapplied: string[];
}

/**
 * Rolls over the write alias, then reapplies the aliases of the old head that
 * the new head is missing, because a manual `_rollover` does not copy
 * secondary aliases.
 *
 * @param connection - The live connection.
 * @param alias - The write alias to roll over.
 * @returns The old and new head and the reapplied alias names.
 */
export async function rollover(
  connection: Connection,
  alias: string,
): Promise<RolloverResult> {
  const response = await connection.client.indices.rollover({ alias });
  const body = response.body as { old_index: string; new_index: string };
  const [oldAliases, newAliases] = await Promise.all([
    aliasesOf(connection, body.old_index),
    aliasesOf(connection, body.new_index),
  ]);
  const missing = Object.entries(oldAliases).filter(
    ([name]) => newAliases[name] === undefined,
  );
  if (missing.length > 0) {
    await connection.client.indices.updateAliases({
      body: {
        actions: missing.map(([name, config]) => ({
          add: { index: body.new_index, alias: name, ...config },
        })),
      },
    });
  }
  return {
    oldIndex: body.old_index,
    newIndex: body.new_index,
    reapplied: missing.map(([name]) => name),
  };
}

/** The alias configurations of one index, keyed by alias name. */
type AliasConfigs = Record<string, Record<string, unknown>>;

/**
 * Reads the alias configurations of an index.
 *
 * @param connection - The live connection.
 * @param index - The index name.
 * @returns The alias configurations, keyed by alias name.
 */
async function aliasesOf(
  connection: Connection,
  index: string,
): Promise<AliasConfigs> {
  const response = await connection.client.indices.getAlias({ index });
  const body = response.body as Record<string, { aliases?: AliasConfigs }>;
  return body[index]?.aliases ?? {};
}
