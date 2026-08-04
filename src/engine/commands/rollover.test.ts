import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { rollover } from './rollover';

/** The updateAliases calls the fake client captured. */
type Captured = { body: { actions: unknown[] } }[];

/**
 * Builds a connection whose client answers the rollover flow.
 *
 * @param aliasesByIndex - The alias configurations per index name.
 * @param captured - Receives the updateAliases calls.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(
  aliasesByIndex: Record<string, Record<string, Record<string, unknown>>>,
  captured: Captured,
): Connection {
  return {
    client: {
      indices: {
        rollover: () =>
          Promise.resolve({
            body: { old_index: 'events-000001', new_index: 'events-000002' },
          }),
        getAlias: (params: { index: string }) =>
          Promise.resolve({
            body: {
              [params.index]: { aliases: aliasesByIndex[params.index] ?? {} },
            },
          }),
        updateAliases: (params: { body: { actions: unknown[] } }) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('rollover reapplies the aliases missing on the new head', async () => {
  const captured: Captured = [];
  const connection = fakeConnection(
    {
      'events-000001': {
        events: { is_write_index: false },
        user_events: { filter: { term: { robot: false } } },
      },
      'events-000002': { events: { is_write_index: true } },
    },
    captured,
  );
  const result = await rollover(connection, 'events');
  expect(result).toEqual({
    oldIndex: 'events-000001',
    newIndex: 'events-000002',
    reapplied: ['user_events'],
  });
  expect(captured).toHaveLength(1);
  expect(captured[0]?.body.actions).toEqual([
    {
      add: {
        index: 'events-000002',
        alias: 'user_events',
        filter: { term: { robot: false } },
      },
    },
  ]);
});

test('rollover reapplies nothing when the new head has every alias', async () => {
  const captured: Captured = [];
  const connection = fakeConnection(
    {
      'events-000001': { events: {} },
      'events-000002': { events: {} },
    },
    captured,
  );
  const result = await rollover(connection, 'events');
  expect(result.reapplied).toEqual([]);
  expect(captured).toHaveLength(0);
});
