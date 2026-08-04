// The index listing query.

import type { Connection } from '../connection/connection';

/** One index row of /index ls. */
export interface IndexInfo {
  /** The index name. */
  name: string;
  /** The index health, for example `green`, `yellow`, or `red`. */
  health: string;
  /** The number of documents. */
  docsCount: number;
  /** The store size, human readable. */
  storeSize: string;
  /** The store size in bytes. */
  storeBytes: number;
  /** The creation date, ISO formatted. */
  creationDate: string;
  /** The alias names pointing at the index; `*` marks the write alias. */
  aliases: string[];
}

/** One row of the cat indices response. */
interface CatIndexRow {
  index: string;
  health: string;
  'docs.count': string | null;
  'store.size': string | null;
  'creation.date.string': string;
}

/** One row of the cat aliases response. */
interface CatAliasRow {
  alias: string;
  index: string;
  is_write_index: string;
}

/**
 * Lists the indices matching the pattern, with their aliases.
 *
 * @param connection - The live connection.
 * @param pattern - An index name or pattern; all indices when omitted.
 * @returns The indices sorted by name.
 */
export async function listIndices(
  connection: Connection,
  pattern?: string,
): Promise<IndexInfo[]> {
  const [indices, aliases] = await Promise.all([
    connection.client.cat.indices({
      index: pattern,
      bytes: 'b',
      format: 'json',
      h: [
        'index',
        'health',
        'docs.count',
        'store.size',
        'creation.date.string',
      ],
      s: ['index'],
    }),
    connection.client.cat.aliases({ format: 'json' }),
  ]);
  const byIndex = aliasesByIndex(aliases.body as CatAliasRow[]);
  return (indices.body as CatIndexRow[]).map((row) => ({
    name: row.index,
    health: row.health,
    docsCount: Number(row['docs.count'] ?? 0),
    storeSize: formatBytes(Number(row['store.size'] ?? 0)),
    storeBytes: Number(row['store.size'] ?? 0),
    creationDate: row['creation.date.string'],
    aliases: byIndex.get(row.index) ?? [],
  }));
}

const UNITS = ['b', 'kb', 'mb', 'gb', 'tb', 'pb'];

/**
 * Formats a byte count as a human readable size.
 *
 * @param bytes - The byte count.
 * @returns The size with its unit, for example `1.2 mb`.
 */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 ? String(value) : value.toFixed(1);
  return `${rounded} ${UNITS[unit]}`;
}

/**
 * Groups the alias names by index, marking write aliases with `*`.
 *
 * @param rows - The cat aliases rows.
 * @returns The alias names per index name.
 */
function aliasesByIndex(rows: CatAliasRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const name = row.is_write_index === 'true' ? `${row.alias}*` : row.alias;
    const list = map.get(row.index) ?? [];
    list.push(name);
    map.set(row.index, list);
  }
  return map;
}
