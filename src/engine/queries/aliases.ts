// The alias tree query.

import type { Connection } from '../connection/connection';

/** One index an alias points at. */
interface AliasTarget {
  /** The index name. */
  index: string;
  /** Whether the index is the write index of the alias. */
  write: boolean;
  /** Whether the alias filters the documents of the index. */
  filtered: boolean;
}

/** One alias and the indices it points at. */
export interface AliasInfo {
  /** The alias name. */
  name: string;
  /** The targets, sorted by index name. */
  targets: AliasTarget[];
}

/**
 * Lists the aliases with their target indices.
 *
 * @param connection - The live connection.
 * @returns The aliases sorted by name.
 */
export async function listAliases(
  connection: Connection,
): Promise<AliasInfo[]> {
  const response = await connection.client.indices.getAlias({});
  const body = response.body as Record<string, IndexEntry>;
  const byName = new Map<string, AliasTarget[]>();
  for (const [index, entry] of Object.entries(body)) {
    for (const [name, config] of Object.entries(entry.aliases ?? {})) {
      const targets = byName.get(name) ?? [];
      targets.push({
        index,
        write: config.is_write_index === true,
        filtered: config.filter !== undefined,
      });
      byName.set(name, targets);
    }
  }
  return [...byName.entries()]
    .map(([name, targets]) => ({
      name,
      targets: targets.sort((a, b) => a.index.localeCompare(b.index)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One index entry of the getAlias response. */
interface IndexEntry {
  aliases?: Record<string, { is_write_index?: boolean; filter?: unknown }>;
}
