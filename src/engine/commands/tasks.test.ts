import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { cancelTask } from './tasks';

/**
 * Builds a connection whose client answers the cancel call.
 *
 * @param body - The cancel response body.
 * @param captured - Receives the called parameters.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(body: unknown, captured: unknown[]): Connection {
  return {
    client: {
      tasks: {
        cancel: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('cancelTask cancels the named task', async () => {
  const captured: unknown[] = [];
  await cancelTask(fakeConnection({ nodes: {} }, captured), 'node-a:12');
  expect(captured).toEqual([{ task_id: 'node-a:12' }]);
});

test('cancelTask throws the node failure reason', async () => {
  const body = {
    node_failures: [
      {
        reason: 'Failed node [bogus]',
        caused_by: { reason: 'No such node [bogus]' },
      },
    ],
  };
  expect(cancelTask(fakeConnection(body, []), 'bogus:1')).rejects.toThrow(
    'No such node [bogus]',
  );
});
