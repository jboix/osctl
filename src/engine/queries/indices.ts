// The index queries: listing, definition, and settings.

import { formatBytes } from '../../utils/format';
import type { Connection } from '../connection/connection';
import { statusOf } from '../connection/failure';

/** One index row of /index ls. */
export interface IndexInfo {
  /** The index name. */
  name: string;
  /** The index health, for example `green`, `yellow`, or `red`. */
  health: string;
  /** The number of documents. */
  docsCount: number;
  /** The number of deleted documents. */
  docsDeleted: number;
  /** The store size, human readable. */
  storeSize: string;
  /** The store size in bytes. */
  storeBytes: number;
  /** The indexing operations on the primaries since the shards started. */
  indexed: number;
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
  'docs.deleted': string | null;
  'store.size': string | null;
  'pri.indexing.index_total': string | null;
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
        'docs.deleted',
        'store.size',
        'pri.indexing.index_total',
        'creation.date.string',
      ],
      s: ['index'],
    }),
    connection.client.cat.aliases({ format: 'json' }),
  ]);
  const byIndex = aliasesByIndex(aliases.body as CatAliasRow[]);
  return (indices.body as CatIndexRow[]).map((row) =>
    toIndexInfo(row, byIndex.get(row.index) ?? []),
  );
}

/**
 * Maps one cat indices row to the listing shape.
 *
 * @param row - The cat indices row.
 * @param aliases - The alias names pointing at the index.
 * @returns The index row.
 */
function toIndexInfo(row: CatIndexRow, aliases: string[]): IndexInfo {
  return {
    name: row.index,
    health: row.health,
    docsCount: Number(row['docs.count'] ?? 0),
    docsDeleted: Number(row['docs.deleted'] ?? 0),
    storeSize: formatBytes(Number(row['store.size'] ?? 0)),
    storeBytes: Number(row['store.size'] ?? 0),
    indexed: Number(row['pri.indexing.index_total'] ?? 0),
    creationDate: row['creation.date.string'],
    aliases,
  };
}

/**
 * Reads one index: aliases, mappings, and settings.
 *
 * @param connection - The live connection.
 * @param name - The index name.
 * @returns The index definition, or undefined when the index is missing.
 */
export async function getIndex(
  connection: Connection,
  name: string,
): Promise<unknown> {
  try {
    const response = await connection.client.indices.get({ index: name });
    return (response.body as Record<string, unknown>)[name];
  } catch (error) {
    if (statusOf(error) === 404) {
      return undefined;
    }
    throw error;
  }
}

/** The settings keys the cluster manages; they cannot be sent back. */
const INTERNAL_SETTINGS = [
  'index.uuid',
  'index.creation_date',
  'index.provided_name',
];

/**
 * Reads the settings of one index with flat keys, without the internal keys
 * the cluster manages.
 *
 * @param connection - The live connection.
 * @param name - The index name.
 * @returns The settings, or undefined when the index is missing.
 */
export async function getIndexSettings(
  connection: Connection,
  name: string,
): Promise<Record<string, unknown> | undefined> {
  let body: Record<string, { settings?: Record<string, unknown> }>;
  try {
    const response = await connection.client.indices.getSettings({
      index: name,
      flat_settings: true,
    });
    body = response.body as typeof body;
  } catch (error) {
    if (statusOf(error) === 404) {
      return undefined;
    }
    throw error;
  }
  const settings = body[name]?.settings;
  if (settings === undefined) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(settings).filter(
      ([key]) =>
        !INTERNAL_SETTINGS.includes(key) && !key.startsWith('index.version.'),
    ),
  );
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
