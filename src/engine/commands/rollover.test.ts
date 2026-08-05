import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { rollover } from './rollover';

/** The updateAliases calls the fake client captured. */
type Captured = { body: { actions: unknown[] } }[];

/** The alias configurations per index, before and after the rollover. */
interface FakeState {
  /** The aliases per index before the rollover. */
  before: Record<string, Record<string, Record<string, unknown>>>;
  /** The aliases per index after the rollover. */
  after: Record<string, Record<string, Record<string, unknown>>>;
}

/**
 * Builds a connection whose client answers the rollover flow. getAlias by
 * name answers from the before state; getAlias by index answers from the
 * before state until the rollover ran, from the after state afterwards.
 *
 * @param state - The alias configurations around the rollover.
 * @param captured - Receives the updateAliases calls.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(state: FakeState, captured: Captured): Connection {
  let rolled = false;
  return {
    client: {
      indices: {
        getAlias: (params: { name?: string; index?: string | string[] }) => {
          const source = rolled ? state.after : state.before;
          if (params.name !== undefined) {
            const entries = Object.entries(source).filter(([, aliases]) =>
              Object.hasOwn(aliases, params.name ?? ''),
            );
            return Promise.resolve({
              body: Object.fromEntries(
                entries.map(([index, aliases]) => [index, { aliases }]),
              ),
            });
          }
          const names = Array.isArray(params.index)
            ? params.index
            : [params.index ?? ''];
          return Promise.resolve({
            body: Object.fromEntries(
              names.map((index) => [index, { aliases: source[index] ?? {} }]),
            ),
          });
        },
        rollover: () => {
          rolled = true;
          return Promise.resolve({
            body: { old_index: 'events-000001', new_index: 'events-000002' },
          });
        },
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
      before: {
        'events-000001': {
          events: { is_write_index: true },
          user_events: { filter: { term: { robot: false } } },
        },
      },
      after: {
        'events-000001': {
          events: { is_write_index: false },
          user_events: { filter: { term: { robot: false } } },
        },
        'events-000002': { events: { is_write_index: true } },
      },
    },
    captured,
  );
  const result = await rollover(connection, 'events');
  expect(result).toEqual({
    oldIndex: 'events-000001',
    newIndex: 'events-000002',
    reapplied: ['user_events'],
  });
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

test('rollover restores aliases a classic swap strips from the old head', async () => {
  const captured: Captured = [];
  const connection = fakeConnection(
    {
      before: {
        'events-000001': { events: {}, user_events: {} },
      },
      after: {
        'events-000001': {},
        'events-000002': { events: {} },
      },
    },
    captured,
  );
  const result = await rollover(connection, 'events');
  expect(result.reapplied).toEqual(['user_events']);
});

test('rollover reapplies nothing when the new head has every alias', async () => {
  const captured: Captured = [];
  const connection = fakeConnection(
    {
      before: { 'events-000001': { events: { is_write_index: true } } },
      after: {
        'events-000001': { events: { is_write_index: false } },
        'events-000002': { events: { is_write_index: true } },
      },
    },
    captured,
  );
  const result = await rollover(connection, 'events');
  expect(result.reapplied).toEqual([]);
  expect(captured).toHaveLength(0);
});
