import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { createIndex } from './create-index';
import { deleteIndices } from './delete-indices';

/**
 * Builds a connection whose client captures the index calls.
 *
 * @param captured - Receives the called parameters.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(captured: unknown[]): Connection {
  return {
    client: {
      indices: {
        create: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
        delete: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('createIndex creates the named index', async () => {
  const captured: unknown[] = [];
  await createIndex(fakeConnection(captured), 'events-000001');
  expect(captured).toEqual([{ index: 'events-000001' }]);
});

test('deleteIndices deletes the named indices', async () => {
  const captured: unknown[] = [];
  await deleteIndices(fakeConnection(captured), ['a-000001', 'b-000001']);
  expect(captured).toEqual([{ index: ['a-000001', 'b-000001'] }]);
});
