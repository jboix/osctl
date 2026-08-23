import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { getIndex, getIndexSettings, listIndices } from './indices';

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
        'docs.deleted': '3',
        'store.size': '1234567',
        'pri.indexing.index_total': '100',
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
      docsDeleted: 3,
      storeSize: '1.2 mb',
      storeBytes: 1234567,
      indexed: 100,
      creationDate: '2026-08-01T00:00:00Z',
      aliases: ['core_events*', 'user_events'],
    },
  ]);
});

/**
 * Builds a connection whose client answers one indices method.
 *
 * @param method - The method name.
 * @param respond - Produces the response, or throws.
 * @returns A connection backed by the fake client.
 */
function fakeMethod(
  method: string,
  respond: (params: unknown) => unknown,
): Connection {
  return {
    client: {
      indices: {
        [method]: (params: unknown) => Promise.resolve(respond(params)),
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('getIndex returns the definition of the named index', async () => {
  const definition = { aliases: {}, mappings: {}, settings: {} };
  const connection = fakeMethod('get', () => ({
    body: { 'events-000001': definition },
  }));
  expect(await getIndex(connection, 'events-000001')).toEqual(definition);
});

test('getIndex returns undefined for a missing index', async () => {
  const connection = fakeMethod('get', () => {
    throw { meta: { statusCode: 404 } };
  });
  expect(await getIndex(connection, 'absent')).toBeUndefined();
});

test('getIndexSettings strips the internal keys', async () => {
  let params: unknown;
  const connection = fakeMethod('getSettings', (given) => {
    params = given;
    return {
      body: {
        'events-000001': {
          settings: {
            'index.number_of_shards': '1',
            'index.refresh_interval': '30s',
            'index.uuid': 'abc',
            'index.creation_date': '123',
            'index.provided_name': 'events-000001',
            'index.version.created': '136217927',
          },
        },
      },
    };
  });
  expect(await getIndexSettings(connection, 'events-000001')).toEqual({
    'index.number_of_shards': '1',
    'index.refresh_interval': '30s',
  });
  expect(params).toEqual({ index: 'events-000001', flat_settings: true });
});

test('getIndexSettings returns undefined for a missing index', async () => {
  const connection = fakeMethod('getSettings', () => {
    throw { meta: { statusCode: 404 } };
  });
  expect(await getIndexSettings(connection, 'absent')).toBeUndefined();
});

test('listIndices tolerates missing counts and aliases', async () => {
  const connection = fakeConnection(
    [
      {
        index: 'empty-000001',
        health: 'yellow',
        'docs.count': null,
        'docs.deleted': null,
        'store.size': null,
        'pri.indexing.index_total': null,
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
      docsDeleted: 0,
      storeSize: '0 b',
      storeBytes: 0,
      indexed: 0,
      creationDate: '2026-08-02T00:00:00Z',
      aliases: [],
    },
  ]);
});
