import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import {
  clusterInfo,
  clusterSettings,
  explainAllocation,
  listNodes,
} from './cluster';

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

/**
 * Builds a connection whose client answers one cluster method.
 *
 * @param area - The client area, `cluster` or `cat`.
 * @param method - The method name.
 * @param respond - Produces the response, or throws.
 * @returns A connection backed by the fake client.
 */
function fakeMethod(
  area: 'cluster' | 'cat',
  method: string,
  respond: (params: unknown) => unknown,
): Connection {
  return {
    client: {
      [area]: {
        [method]: (params: unknown) => Promise.resolve(respond(params)),
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('clusterSettings reads both sections with flat keys', async () => {
  let params: unknown;
  const connection = fakeMethod('cluster', 'getSettings', (given) => {
    params = given;
    return {
      body: {
        persistent: { 'cluster.routing.allocation.enable': 'all' },
        transient: {},
      },
    };
  });
  expect(await clusterSettings(connection)).toEqual({
    persistent: { 'cluster.routing.allocation.enable': 'all' },
    transient: {},
  });
  expect(params).toEqual({ flat_settings: true });
});

test('clusterSettings defaults missing sections to empty objects', async () => {
  const connection = fakeMethod('cluster', 'getSettings', () => ({
    body: {},
  }));
  expect(await clusterSettings(connection)).toEqual({
    persistent: {},
    transient: {},
  });
});

test('listNodes maps the cat rows and marks the cluster manager', async () => {
  const connection = fakeMethod('cat', 'nodes', () => ({
    body: [
      {
        name: 'node-1',
        'node.role': 'dim',
        cluster_manager: '*',
        version: '3.0.0',
        'heap.percent': '43',
        cpu: '7',
        load_1m: '0.51',
        load_5m: '0.32',
        load_15m: '0.28',
      },
      {
        name: 'node-2',
        'node.role': 'd',
        cluster_manager: '-',
        version: '3.0.0',
        'heap.percent': null,
        cpu: null,
        load_1m: null,
        load_5m: null,
        load_15m: null,
      },
    ],
  }));
  expect(await listNodes(connection)).toEqual([
    {
      name: 'node-1',
      roles: 'dim',
      manager: true,
      version: '3.0.0',
      heapPercent: 43,
      cpu: 7,
      load1m: '0.51',
      load5m: '0.32',
      load15m: '0.28',
    },
    {
      name: 'node-2',
      roles: 'd',
      manager: false,
      version: '3.0.0',
      heapPercent: undefined,
      cpu: undefined,
      load1m: undefined,
      load5m: undefined,
      load15m: undefined,
    },
  ]);
});

test('explainAllocation maps the shard, the reason, and the decisions', async () => {
  const connection = fakeMethod('cluster', 'allocationExplain', () => ({
    body: {
      index: 'events-000001',
      shard: 0,
      primary: false,
      current_state: 'unassigned',
      unassigned_info: { reason: 'NODE_LEFT' },
      allocate_explanation: 'cannot allocate because of the deciders below',
      node_allocation_decisions: [
        {
          node_name: 'node-1',
          node_decision: 'no',
          deciders: [
            { explanation: 'a copy of this shard is already allocated' },
            {},
          ],
        },
      ],
    },
  }));
  expect(await explainAllocation(connection)).toEqual({
    index: 'events-000001',
    shard: 0,
    primary: false,
    currentState: 'unassigned',
    unassignedReason: 'NODE_LEFT',
    explanation: 'cannot allocate because of the deciders below',
    decisions: [
      {
        node: 'node-1',
        decision: 'no',
        reasons: ['a copy of this shard is already allocated'],
      },
    ],
  });
});

test('explainAllocation returns undefined without unassigned shards', async () => {
  const connection = fakeMethod('cluster', 'allocationExplain', () => {
    throw {
      meta: {
        statusCode: 400,
        body: {
          error: {
            reason: 'unable to find any unassigned shards to explain',
          },
        },
      },
    };
  });
  expect(await explainAllocation(connection)).toBeUndefined();
});

test('explainAllocation rethrows other failures', async () => {
  const connection = fakeMethod('cluster', 'allocationExplain', () => {
    throw { meta: { statusCode: 500, body: { error: { reason: 'boom' } } } };
  });
  expect(explainAllocation(connection)).rejects.toEqual({
    meta: { statusCode: 500, body: { error: { reason: 'boom' } } },
  });
});
