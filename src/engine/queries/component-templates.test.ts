import { expect, test } from 'bun:test';
import { matchesPattern } from '../../utils/pattern';
import type { Connection } from '../connection/connection';
import { getComponent, listComponents } from './component-templates';

const body = {
  component_templates: [
    {
      name: 'events_mappings',
      component_template: {
        template: { mappings: {} },
        version: 2,
      },
    },
    {
      name: 'base_settings',
      component_template: {
        template: { settings: {} },
      },
    },
  ],
};

/**
 * Builds a connection whose client answers getComponentTemplate like the
 * cluster: the name expands as a pattern, and a missing plain name rejects
 * with 404.
 *
 * @returns A connection backed by the fake client.
 */
function fakeConnection(): Connection {
  return {
    client: {
      cluster: {
        getComponentTemplate: (params?: { name?: string }) => {
          if (params?.name === undefined) {
            return Promise.resolve({ body });
          }
          const matches = body.component_templates.filter((entry) =>
            matchesPattern(entry.name, params.name),
          );
          if (matches.length === 0 && !params.name.includes('*')) {
            const error = new Error('component template matching not found');
            (error as { meta?: unknown }).meta = { statusCode: 404 };
            return Promise.reject(error);
          }
          return Promise.resolve({ body: { component_templates: matches } });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('listComponents maps and sorts the component templates', async () => {
  expect(await listComponents(fakeConnection())).toEqual([
    { name: 'base_settings', version: undefined },
    { name: 'events_mappings', version: 2 },
  ]);
});

test('getComponent returns the definition of the named template', async () => {
  expect(await getComponent(fakeConnection(), 'events_mappings')).toEqual({
    template: { mappings: {} },
    version: 2,
  });
});

test('getComponent does not return the first pattern expansion match', async () => {
  expect(await getComponent(fakeConnection(), 'events*')).toBeUndefined();
});

test('getComponent returns undefined for a missing template', async () => {
  expect(await getComponent(fakeConnection(), 'missing')).toBeUndefined();
});
