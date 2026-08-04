import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { health } from './health';

/**
 * Builds a connection whose client answers the health call with the given body.
 *
 * @param body - The response body the fake client returns.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(body: unknown): Connection {
  return {
    client: {
      cluster: {
        health: () => Promise.resolve({ body }),
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('health returns the cluster name and status', async () => {
  const connection = fakeConnection({
    cluster_name: 'monitoring',
    status: 'green',
  });
  expect(await health(connection)).toEqual({
    clusterName: 'monitoring',
    status: 'green',
  });
});

test('health passes a degraded status through unchanged', async () => {
  const connection = fakeConnection({
    cluster_name: 'monitoring',
    status: 'yellow',
  });
  expect((await health(connection)).status).toBe('yellow');
});
