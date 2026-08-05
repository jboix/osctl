import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { applyAliases } from './apply-aliases';

/**
 * Builds a connection whose client captures the updateAliases calls.
 *
 * @param captured - Receives the called parameters.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(captured: unknown[]): Connection {
  return {
    client: {
      indices: {
        updateAliases: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

const actions = [{ add: { index: 'a-000001', alias: 'user_events' } }];

test('applyAliases accepts an object with an actions array', async () => {
  const captured: unknown[] = [];
  const applied = await applyAliases(fakeConnection(captured), { actions });
  expect(applied).toBe(1);
  expect(captured).toEqual([{ body: { actions } }]);
});

test('applyAliases accepts a bare actions array', async () => {
  const captured: unknown[] = [];
  expect(await applyAliases(fakeConnection(captured), actions)).toBe(1);
  expect(captured).toEqual([{ body: { actions } }]);
});

test('applyAliases rejects other payloads', async () => {
  expect(applyAliases(fakeConnection([]), { nope: true })).rejects.toThrow(
    'actions',
  );
});
