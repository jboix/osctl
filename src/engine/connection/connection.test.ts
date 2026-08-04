import { expect, test } from 'bun:test';
import { Client } from '@opensearch-project/opensearch';
import type { Profile } from '../config/profile';
import { createConnection } from './connection';

const profile: Profile = {
  name: 'test',
  host: 'https://localhost:9201',
  username: 'admin',
  tlsVerify: false,
};

test('createConnection returns a client bound to the profile', () => {
  const connection = createConnection(profile, 'secret');
  expect(connection.client).toBeInstanceOf(Client);
  expect(connection.profile).toEqual(profile);
});

test('createConnection works without credentials', () => {
  const connection = createConnection({
    name: 'local',
    host: 'http://localhost:9200',
    tlsVerify: true,
  });
  expect(connection.client).toBeInstanceOf(Client);
});
