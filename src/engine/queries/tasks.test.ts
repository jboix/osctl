import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { getTask, listTasks } from './tasks';

/**
 * Builds a connection whose client answers the task calls.
 *
 * @param methods - The fake client methods.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(methods: Record<string, unknown>): Connection {
  return {
    client: methods,
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('listTasks maps the rows and sorts longest running first', async () => {
  const connection = fakeConnection({
    cat: {
      tasks: () =>
        Promise.resolve({
          body: [
            {
              action: 'indices:data/write/reindex',
              task_id: 'node-a:12',
              parent_task_id: '-',
              type: 'transport',
              running_time: '1.2s',
              running_time_ns: '1200000000',
              node: 'node-a',
            },
            {
              action: 'cluster:monitor/tasks/lists',
              task_id: 'node-a:99',
              parent_task_id: 'node-a:12',
              type: 'direct',
              running_time: '2.5s',
              running_time_ns: '2500000000',
              node: 'node-a',
            },
          ],
        }),
    },
  });
  expect(await listTasks(connection)).toEqual([
    {
      id: 'node-a:99',
      action: 'cluster:monitor/tasks/lists',
      type: 'direct',
      parent: 'node-a:12',
      runningTime: '2.5s',
      runningNanos: 2_500_000_000,
      node: 'node-a',
    },
    {
      id: 'node-a:12',
      action: 'indices:data/write/reindex',
      type: 'transport',
      parent: undefined,
      runningTime: '1.2s',
      runningNanos: 1_200_000_000,
      node: 'node-a',
    },
  ]);
});

test('getTask returns the task document', async () => {
  const document = { completed: false, task: { action: 'reindex' } };
  const connection = fakeConnection({
    tasks: { get: () => Promise.resolve({ body: document }) },
  });
  expect(await getTask(connection, 'node-a:12')).toEqual(document);
});

test('getTask returns undefined for a missing task', async () => {
  const connection = fakeConnection({
    tasks: {
      get: () => Promise.reject({ meta: { statusCode: 404 } }),
    },
  });
  expect(await getTask(connection, 'node-a:404')).toBeUndefined();
});
