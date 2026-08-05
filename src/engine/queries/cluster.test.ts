import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { clusterInfo } from './cluster';

/**
 * Builds a connection whose client answers the cluster calls.
 *
 * @returns A connection backed by the fake client.
 */
function fakeConnection(): Connection {
  return {
    client: {
      cluster: {
        health: () =>
          Promise.resolve({
            body: {
              cluster_name: 'docker-cluster',
              status: 'green',
              number_of_nodes: 1,
              unassigned_shards: 2,
            },
          }),
        state: () =>
          Promise.resolve({
            body: {
              blocks: {
                global: {
                  '10': { description: 'cluster create-index blocked (api)' },
                },
                indices: {
                  'old-000001': {
                    '5': { description: 'index read-only (api)' },
                  },
                },
              },
            },
          }),
      },
      cat: {
        allocation: () =>
          Promise.resolve({
            body: [
              { node: '172.18.0.2', 'disk.percent': '97' },
              { node: 'UNASSIGNED', 'disk.percent': null },
            ],
          }),
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('clusterInfo joins health, blocks, and disk usage', async () => {
  expect(await clusterInfo(fakeConnection())).toEqual({
    clusterName: 'docker-cluster',
    status: 'green',
    nodes: 1,
    unassignedShards: 2,
    blocks: [
      'cluster create-index blocked (api)',
      'old-000001: index read-only (api)',
    ],
    disk: [{ node: '172.18.0.2', percent: 97 }, { node: 'UNASSIGNED' }],
  });
});
