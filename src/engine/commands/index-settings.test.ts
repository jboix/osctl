import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { applyIndexSettings } from './index-settings';

/**
 * Builds a connection whose client captures the settings calls.
 *
 * @param captured - Receives the called parameters.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(captured: unknown[]): Connection {
  return {
    client: {
      indices: {
        putSettings: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('applyIndexSettings puts the changed settings', async () => {
  const captured: unknown[] = [];
  const payload = { 'index.refresh_interval': '30s' };
  await applyIndexSettings(fakeConnection(captured), 'events-000001', payload);
  expect(captured).toEqual([{ index: 'events-000001', body: payload }]);
});

test('applyIndexSettings rejects payloads that are no objects', async () => {
  expect(
    applyIndexSettings(fakeConnection([]), 'events-000001', [1]),
  ).rejects.toThrow('object');
});

test('applyIndexSettings rejects an empty payload', async () => {
  expect(
    applyIndexSettings(fakeConnection([]), 'events-000001', {}),
  ).rejects.toThrow('no settings');
});
