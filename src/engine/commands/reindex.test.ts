import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { reindex } from './reindex';

/**
 * Builds a connection whose client captures the reindex call.
 *
 * @param captured - Receives the called parameters.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(captured: unknown[]): Connection {
  return {
    client: {
      reindex: (params: unknown) => {
        captured.push(params);
        return Promise.resolve({ body: { task: 'node-a:42' } });
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('reindex starts the task and returns its identifier', async () => {
  const captured: unknown[] = [];
  const payload = {
    source: { index: 'events-000001' },
    dest: { index: 'events-000002' },
  };
  expect(await reindex(fakeConnection(captured), payload)).toBe('node-a:42');
  expect(captured).toEqual([{ body: payload, wait_for_completion: false }]);
});

test('reindex rejects payloads that are no objects', async () => {
  expect(reindex(fakeConnection([]), [1])).rejects.toThrow('object');
});

test('reindex rejects bodies without source and dest', async () => {
  expect(
    reindex(fakeConnection([]), { source: { index: 'a' } }),
  ).rejects.toThrow('source');
});
