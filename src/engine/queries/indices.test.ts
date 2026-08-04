import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { listIndices } from './indices';

/**
 * Builds a connection whose client answers the cat calls with the given rows.
 *
 * @param indices - The rows the fake cat.indices call returns.
 * @param aliases - The rows the fake cat.aliases call returns.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(indices: unknown[], aliases: unknown[]): Connection {
  return {
    client: {
      cat: {
        indices: () => Promise.resolve({ body: indices }),
        aliases: () => Promise.resolve({ body: aliases }),
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('listIndices joins the aliases and parses the counts', async () => {
  const connection = fakeConnection(
    [
      {
        index: 'core_events-000001',
        health: 'green',
        'docs.count': '42',
        'store.size': '1234567',
        'creation.date.string': '2026-08-01T00:00:00Z',
      },
    ],
    [
      {
        alias: 'core_events',
        index: 'core_events-000001',
        is_write_index: 'true',
      },
      {
        alias: 'user_events',
        index: 'core_events-000001',
        is_write_index: 'false',
      },
      { alias: 'other', index: 'unrelated', is_write_index: 'false' },
    ],
  );
  expect(await listIndices(connection)).toEqual([
    {
      name: 'core_events-000001',
      health: 'green',
      docsCount: 42,
      storeSize: '1.2 mb',
      storeBytes: 1234567,
      creationDate: '2026-08-01T00:00:00Z',
      aliases: ['core_events*', 'user_events'],
    },
  ]);
});

test('listIndices tolerates missing counts and aliases', async () => {
  const connection = fakeConnection(
    [
      {
        index: 'empty-000001',
        health: 'yellow',
        'docs.count': null,
        'store.size': null,
        'creation.date.string': '2026-08-02T00:00:00Z',
      },
    ],
    [],
  );
  expect(await listIndices(connection)).toEqual([
    {
      name: 'empty-000001',
      health: 'yellow',
      docsCount: 0,
      storeSize: '0 b',
      storeBytes: 0,
      creationDate: '2026-08-02T00:00:00Z',
      aliases: [],
    },
  ]);
});
