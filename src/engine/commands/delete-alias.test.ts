import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { deleteAlias } from './delete-alias';

test('deleteAlias removes the alias from every index it points at', async () => {
  const captured: unknown[] = [];
  const connection = {
    client: {
      indices: {
        getAlias: () =>
          Promise.resolve({
            body: { 'b-000001': { aliases: {} }, 'a-000001': { aliases: {} } },
          }),
        deleteAlias: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: { acknowledged: true } });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
  expect(await deleteAlias(connection, 'user_events')).toEqual([
    'a-000001',
    'b-000001',
  ]);
  expect(captured).toEqual([
    { index: ['a-000001', 'b-000001'], name: 'user_events' },
  ]);
});
