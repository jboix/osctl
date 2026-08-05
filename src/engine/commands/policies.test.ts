import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { applyPolicy, deletePolicy } from './policies';

/**
 * Builds a connection whose client captures the ism calls.
 *
 * @param existing - Whether the policy already exists.
 * @param captured - Receives the called parameters.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(existing: boolean, captured: unknown[]): Connection {
  return {
    client: {
      ism: {
        getPolicy: () => {
          if (!existing) {
            const error = new Error('not found');
            (error as { meta?: unknown }).meta = { statusCode: 404 };
            return Promise.reject(error);
          }
          return Promise.resolve({
            body: { _seq_no: 7, _primary_term: 2, policy: {} },
          });
        },
        putPolicy: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: {} });
        },
        deletePolicy: (params: unknown) => {
          captured.push(params);
          return Promise.resolve({ body: {} });
        },
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

const policy = { description: 'x', default_state: 'hot', states: [] };

test('applyPolicy creates a missing policy without concurrency params', async () => {
  const captured: unknown[] = [];
  const outcome = await applyPolicy(fakeConnection(false, captured), 'p', {
    policy,
  });
  expect(outcome).toBe('created');
  expect(captured).toEqual([{ policy_id: 'p', body: { policy } }]);
});

test('applyPolicy updates an existing policy with seq_no and primary_term', async () => {
  const captured: unknown[] = [];
  const outcome = await applyPolicy(
    fakeConnection(true, captured),
    'p',
    policy,
  );
  expect(outcome).toBe('updated');
  expect(captured).toEqual([
    { policy_id: 'p', if_seq_no: 7, if_primary_term: 2, body: { policy } },
  ]);
});

test('applyPolicy rejects payloads that are no objects', async () => {
  expect(applyPolicy(fakeConnection(false, []), 'p', [1])).rejects.toThrow(
    'object',
  );
});

test('deletePolicy deletes the named policy', async () => {
  const captured: unknown[] = [];
  await deletePolicy(fakeConnection(true, captured), 'p');
  expect(captured).toEqual([{ policy_id: 'p' }]);
});
