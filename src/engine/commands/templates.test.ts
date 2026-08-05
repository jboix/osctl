import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { applyTemplate, deleteTemplate } from './templates';

/**
 * Builds a connection whose client captures the template calls.
 *
 * @param captured - Receives the called parameters.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(captured: unknown[]): Connection {
  return {
    client: {
      indices: {
        putIndexTemplate: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
        deleteIndexTemplate: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('applyTemplate puts the template definition', async () => {
  const captured: unknown[] = [];
  const payload = { index_patterns: ['events*'], priority: 10 };
  await applyTemplate(fakeConnection(captured), 'events_template', payload);
  expect(captured).toEqual([{ name: 'events_template', body: payload }]);
});

test('applyTemplate rejects payloads that are no objects', async () => {
  expect(
    applyTemplate(fakeConnection([]), 'events_template', [1]),
  ).rejects.toThrow('object');
});

test('deleteTemplate deletes the named template', async () => {
  const captured: unknown[] = [];
  await deleteTemplate(fakeConnection(captured), 'events_template');
  expect(captured).toEqual([{ name: 'events_template' }]);
});
