import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { applyComponent, deleteComponent } from './component-templates';

/**
 * Builds a connection whose client captures the component template calls.
 *
 * @param captured - Receives the called parameters.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(captured: unknown[]): Connection {
  return {
    client: {
      cluster: {
        putComponentTemplate: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
        deleteComponentTemplate: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('applyComponent puts the component template definition', async () => {
  const captured: unknown[] = [];
  const payload = { template: { settings: {} }, version: 1 };
  await applyComponent(fakeConnection(captured), 'base_settings', payload);
  expect(captured).toEqual([{ name: 'base_settings', body: payload }]);
});

test('applyComponent rejects payloads that are no objects', async () => {
  expect(
    applyComponent(fakeConnection([]), 'base_settings', [1]),
  ).rejects.toThrow('object');
});

test('deleteComponent deletes the named component template', async () => {
  const captured: unknown[] = [];
  await deleteComponent(fakeConnection(captured), 'base_settings');
  expect(captured).toEqual([{ name: 'base_settings' }]);
});
