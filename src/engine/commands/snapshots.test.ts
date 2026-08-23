import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { createSnapshot, deleteSnapshot, restoreSnapshot } from './snapshots';

/**
 * Builds a connection whose client captures the snapshot calls.
 *
 * @param captured - Receives the called parameters.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(captured: unknown[]): Connection {
  const capture = (params: unknown): Promise<unknown> => {
    captured.push(params);
    return Promise.resolve({ body: { accepted: true } });
  };
  return {
    client: {
      snapshot: { create: capture, restore: capture, delete: capture },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('createSnapshot starts the snapshot without waiting', async () => {
  const captured: unknown[] = [];
  const payload = { indices: 'events*' };
  await createSnapshot(fakeConnection(captured), 'nightly', 'snap-1', payload);
  expect(captured).toEqual([
    {
      repository: 'nightly',
      snapshot: 'snap-1',
      body: payload,
      wait_for_completion: false,
    },
  ]);
});

test('createSnapshot rejects payloads that are no objects', async () => {
  expect(
    createSnapshot(fakeConnection([]), 'nightly', 'snap-1', [1]),
  ).rejects.toThrow('object');
});

test('restoreSnapshot starts the restore', async () => {
  const captured: unknown[] = [];
  const payload = { indices: 'events*', include_global_state: false };
  await restoreSnapshot(fakeConnection(captured), 'nightly', 'snap-1', payload);
  expect(captured).toEqual([
    { repository: 'nightly', snapshot: 'snap-1', body: payload },
  ]);
});

test('deleteSnapshot deletes the named snapshot', async () => {
  const captured: unknown[] = [];
  await deleteSnapshot(fakeConnection(captured), 'nightly', 'snap-1');
  expect(captured).toEqual([{ repository: 'nightly', snapshot: 'snap-1' }]);
});
