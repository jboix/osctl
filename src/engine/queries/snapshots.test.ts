import { expect, test } from 'bun:test';
import type { Connection } from '../connection/connection';
import { getSnapshot, listRepositories, listSnapshots } from './snapshots';

const repositories = {
  nightly: { type: 'fs', settings: { location: '/backups' } },
  archive: { type: 's3', settings: { bucket: 'archive' } },
};

const snapshots = {
  snapshots: [
    {
      snapshot: 'snap-2',
      state: 'IN_PROGRESS',
      indices: ['events-000001'],
      start_time: '2026-08-23T10:00:00.000Z',
      duration_in_millis: 0,
      failures: [],
    },
    {
      snapshot: 'snap-1',
      state: 'SUCCESS',
      indices: ['events-000001', 'events-000002'],
      start_time: '2026-08-22T10:00:00.000Z',
      duration_in_millis: 65_000,
      failures: [],
    },
  ],
};

/**
 * Builds a connection whose client answers the snapshot calls.
 *
 * @param get - Produces the snapshot get response, or throws.
 * @returns A connection backed by the fake client.
 */
function fakeConnection(get?: (params: unknown) => unknown): Connection {
  return {
    client: {
      snapshot: {
        getRepository: () => Promise.resolve({ body: repositories }),
        get: (params: unknown) =>
          Promise.resolve({ body: (get ?? (() => snapshots))(params) }),
      },
    },
    profile: { name: 'test', host: 'http://localhost:9200', tlsVerify: true },
  } as unknown as Connection;
}

test('listRepositories maps and sorts the repositories', async () => {
  expect(await listRepositories(fakeConnection())).toEqual([
    { name: 'archive', type: 's3' },
    { name: 'nightly', type: 'fs' },
  ]);
});

test('listSnapshots maps one repository sorted by start time', async () => {
  expect(await listSnapshots(fakeConnection(), 'nightly')).toEqual([
    {
      repository: 'nightly',
      name: 'snap-1',
      state: 'SUCCESS',
      indices: 2,
      startTime: '2026-08-22T10:00:00.000Z',
      duration: '1m 5s',
      failures: 0,
    },
    {
      repository: 'nightly',
      name: 'snap-2',
      state: 'IN_PROGRESS',
      indices: 1,
      startTime: '2026-08-23T10:00:00.000Z',
      duration: '0.0s',
      failures: 0,
    },
  ]);
});

test('listSnapshots reads every repository when none is given', async () => {
  const seen: unknown[] = [];
  const result = await listSnapshots(
    fakeConnection((params) => {
      seen.push(params);
      return { snapshots: [] };
    }),
  );
  expect(result).toEqual([]);
  expect(seen).toEqual([
    { repository: 'archive', snapshot: '_all' },
    { repository: 'nightly', snapshot: '_all' },
  ]);
});

test('getSnapshot returns the named snapshot', async () => {
  const snapshot = await getSnapshot(
    fakeConnection(() => ({ snapshots: [snapshots.snapshots[1]] })),
    'nightly',
    'snap-1',
  );
  expect(snapshot).toEqual(snapshots.snapshots[1]);
});

test('getSnapshot returns undefined for a missing snapshot', async () => {
  const snapshot = await getSnapshot(
    fakeConnection(() => {
      throw { meta: { statusCode: 404 } };
    }),
    'nightly',
    'missing',
  );
  expect(snapshot).toBeUndefined();
});
