import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { applyClusterSettings } from './cluster-settings';

/**
 * Builds a connection whose client captures the settings calls.
 *
 * @param captured - Receives the called parameters.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(captured: unknown[]): Connection {
  return {
    client: {
      cluster: {
        putSettings: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('applyClusterSettings puts the settings payload', async () => {
  const captured: unknown[] = [];
  const payload = {
    persistent: { 'cluster.routing.allocation.enable': 'none' },
  };
  await applyClusterSettings(fakeConnection(captured), payload);
  expect(captured).toEqual([{ body: payload }]);
});

test('applyClusterSettings rejects payloads that are no objects', async () => {
  expect(applyClusterSettings(fakeConnection([]), [1])).rejects.toThrow(
    'object',
  );
});

test('applyClusterSettings rejects unknown top-level keys', async () => {
  expect(
    applyClusterSettings(fakeConnection([]), {
      persistent: {},
      settings: {},
    }),
  ).rejects.toThrow('sections');
});

test('applyClusterSettings rejects an empty payload', async () => {
  expect(applyClusterSettings(fakeConnection([]), {})).rejects.toThrow(
    'sections',
  );
});
