import { expect, test } from 'bun:test';
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
 * Builds a connection whose client answers getIndexTemplate with the body.
 *
 * @returns A connection backed by the fake client.
 */
function fakeConnection(): Connection {
  return {
    client: {
      indices: {
        getIndexTemplate: (params?: { name?: string }) =>
          Promise.resolve({
            body:
              params?.name === undefined
                ? body
                : {
                    index_templates: body.index_templates.filter(
                      (entry) => entry.name === params.name,
                    ),
                  },
          }),
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
