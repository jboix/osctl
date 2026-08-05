import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { explainIsm, getPolicy, listPolicies } from './policies';

const policies = {
  policies: [
    {
      _id: 'events_policy',
      _seq_no: 42,
      _primary_term: 3,
      policy: {
        description: 'Rollover and retention',
        default_state: 'hot',
        states: [{ name: 'hot' }, { name: 'delete' }],
      },
    },
  ],
  total_policies: 1,
};

/**
 * Builds a connection whose client answers the ism calls.
 *
 * @param explain - The explainPolicy response body.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(explain: unknown = {}): Connection {
  return {
    client: {
      ism: {
        getPolicies: () => Promise.resolve({ body: policies }),
        getPolicy: (params: { policy_id: string }) => {
          if (params.policy_id !== 'events_policy') {
            const error = new Error('not found');
            (error as { meta?: unknown }).meta = { statusCode: 404 };
            return Promise.reject(error);
          }
          return Promise.resolve({ body: policies.policies[0] });
        },
        explainPolicy: () => Promise.resolve({ body: explain }),
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('listPolicies maps the policies', async () => {
  expect(await listPolicies(fakeConnection())).toEqual([
    {
      name: 'events_policy',
      description: 'Rollover and retention',
      defaultState: 'hot',
      states: ['hot', 'delete'],
    },
  ]);
});

test('getPolicy returns the document with its metadata', async () => {
  const document = await getPolicy(fakeConnection(), 'events_policy');
  expect(document?.seqNo).toBe(42);
  expect(document?.primaryTerm).toBe(3);
  expect(document?.policy).toEqual(policies.policies[0]?.policy);
});

test('getPolicy returns undefined for a missing policy', async () => {
  expect(await getPolicy(fakeConnection(), 'nope')).toBe(undefined);
});

test('explainIsm maps the managed indices', async () => {
  const rows = await explainIsm(
    fakeConnection({
      'core_events-000002': {
        index: 'core_events-000002',
        policy_id: 'events_policy',
        state: { name: 'hot' },
        action: { name: 'rollover' },
        info: { message: 'attempting' },
      },
      'lonely-000001': { index: 'lonely-000001', policy_id: null },
      total_managed_indices: 1,
    }),
  );
  expect(rows).toEqual([
    {
      index: 'core_events-000002',
      policyId: 'events_policy',
      state: 'hot',
      action: 'rollover',
      info: 'attempting',
    },
    {
      index: 'lonely-000001',
      policyId: undefined,
      state: undefined,
      action: undefined,
      info: undefined,
    },
  ]);
});
