import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { listAliases } from './aliases';

/**
 * Builds a connection whose client answers getAlias with the given body.
 *
 * @param body - The response body.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(body: unknown): Connection {
  return {
    client: {
      indices: { getAlias: () => Promise.resolve({ body }) },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('listAliases groups the targets by alias, sorted', async () => {
  const connection = fakeConnection({
    'core_events-000002': {
      aliases: {
        core_events: { is_write_index: true },
        user_events: { filter: { term: { robot: false } } },
      },
    },
    'core_events-000001': {
      aliases: { user_events: { filter: { term: { robot: false } } } },
    },
  });
  expect(await listAliases(connection)).toEqual([
    {
      name: 'core_events',
      targets: [{ index: 'core_events-000002', write: true, filtered: false }],
    },
    {
      name: 'user_events',
      targets: [
        { index: 'core_events-000001', write: false, filtered: true },
        { index: 'core_events-000002', write: false, filtered: true },
      ],
    },
  ]);
});

test('listAliases returns nothing for indices without aliases', async () => {
  const connection = fakeConnection({ 'lonely-000001': { aliases: {} } });
  expect(await listAliases(connection)).toEqual([]);
});
