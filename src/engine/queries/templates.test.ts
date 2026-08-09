import { expect, test } from 'bun:test';
import { matchesPattern } from '../../utils/pattern';
import type { Connection } from '../connection/connection';
import { getTemplate, listTemplates } from './templates';

const body = {
  index_templates: [
    {
      name: 'heartbeat_events_template',
      index_template: {
        index_patterns: ['heartbeat_events*'],
        priority: 100,
      },
    },
    {
      name: 'core_events_template',
      index_template: {
        index_patterns: ['core_events*'],
        priority: 100,
        version: 3,
      },
    },
  ],
};

/**
 * Builds a connection whose client answers getIndexTemplate like the cluster:
 * the name expands as a pattern, and a missing plain name rejects with 404.
 *
 * @returns A connection backed by the fake client.
 */
function fakeConnection(): Connection {
  return {
    client: {
      indices: {
        getIndexTemplate: (params?: { name?: string }) => {
          if (params?.name === undefined) {
            return Promise.resolve({ body });
          }
          const matches = body.index_templates.filter((entry) =>
            matchesPattern(entry.name, params.name),
          );
          if (matches.length === 0 && !params.name.includes('*')) {
            const error = new Error('index_template matching [name] not found');
            (error as { meta?: unknown }).meta = { statusCode: 404 };
            return Promise.reject(error);
          }
          return Promise.resolve({ body: { index_templates: matches } });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('listTemplates maps and sorts the templates', async () => {
  expect(await listTemplates(fakeConnection())).toEqual([
    {
      name: 'core_events_template',
      patterns: ['core_events*'],
      priority: 100,
      version: 3,
    },
    {
      name: 'heartbeat_events_template',
      patterns: ['heartbeat_events*'],
      priority: 100,
      version: undefined,
    },
  ]);
});

test('getTemplate returns the definition of the named template', async () => {
  expect(await getTemplate(fakeConnection(), 'core_events_template')).toEqual({
    index_patterns: ['core_events*'],
    priority: 100,
    version: 3,
  });
});

test('getTemplate does not return the first pattern expansion match', async () => {
  expect(await getTemplate(fakeConnection(), 'core*')).toBeUndefined();
});

test('getTemplate returns undefined for a missing template', async () => {
  expect(await getTemplate(fakeConnection(), 'missing')).toBeUndefined();
});
