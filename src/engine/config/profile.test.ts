import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { type Config, ProfileStore } from './profile';

const dir = mkdtempSync(join(tmpdir(), 'osctl-test-'));
const path = join(dir, 'nested', 'config.json');
const store = new ProfileStore(path);

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const local = { name: 'local', host: 'http://localhost:9200', tlsVerify: true };
const prod = {
  name: 'prod',
  host: 'https://opensearch.example.com:9200',
  tlsVerify: true,
};

/**
 * Seeds the store with the local and prod profiles, prod being the default.
 *
 * @returns Nothing.
 */
function seed(): void {
  store.upsert(local);
  store.upsert(prod);
  store.setDefault('prod');
}

test('upsert then load round-trips the configuration', () => {
  seed();
  const expected: Config = { defaultProfile: 'prod', profiles: [local, prod] };
  expect(store.load()).toEqual(expected);
});

test('load returns an empty configuration when the file does not exist', () => {
  expect(new ProfileStore(join(dir, 'missing.json')).load()).toEqual({
    profiles: [],
  });
});

test('load rejects invalid JSON', () => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '{ not json');
  expect(() => store.load()).toThrow('Invalid JSON');
});

test('load rejects a file without a profiles array', () => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '{ "profiles": "nope" }');
  expect(() => store.load()).toThrow('"profiles" must be an array');
});

test('defaultProfile returns the profile named by the configuration', () => {
  seed();
  expect(store.defaultProfile()?.name).toBe('prod');
});

test('defaultProfile falls back to the first profile', () => {
  store.upsert(local);
  store.upsert(prod);
  expect(store.defaultProfile()?.name).toBe('local');
});

test('defaultProfile returns undefined without profiles', () => {
  expect(new ProfileStore(join(dir, 'missing.json')).defaultProfile()).toBe(
    undefined,
  );
});

test('upsert adds a new profile and keeps the default unchanged', () => {
  seed();
  store.upsert({
    name: 'staging',
    host: 'http://staging:9200',
    tlsVerify: true,
  });
  expect(store.load().profiles).toHaveLength(3);
  expect(store.defaultProfile()?.name).toBe('prod');
});

test('upsert replaces a profile with the same name', () => {
  seed();
  store.upsert({ name: 'prod', host: 'https://new:9200', tlsVerify: false });
  expect(store.load().profiles).toHaveLength(2);
  expect(store.defaultProfile()?.host).toBe('https://new:9200');
});

test('upsert works without an existing configuration file', () => {
  const fresh = new ProfileStore(join(dir, 'fresh', 'config.json'));
  fresh.upsert(local);
  expect(fresh.load()).toEqual({ profiles: [local] });
  expect(fresh.defaultProfile()?.name).toBe('local');
});

test('setDefault switches the default and returns the profile', () => {
  seed();
  const profile = store.setDefault('local');
  expect(profile?.host).toBe('http://localhost:9200');
  expect(store.load().defaultProfile).toBe('local');
});

test('setDefault returns undefined and changes nothing for unknown names', () => {
  seed();
  expect(store.setDefault('nope')).toBe(undefined);
  expect(store.load().defaultProfile).toBe('prod');
});

test('remove deletes the profile and clears a matching default', () => {
  seed();
  expect(store.remove('prod')).toBe(true);
  const config = store.load();
  expect(config.profiles.map((profile) => profile.name)).toEqual(['local']);
  expect(config.defaultProfile).toBe(undefined);
});

test('remove keeps an unrelated default and reports unknown names', () => {
  seed();
  expect(store.remove('local')).toBe(true);
  expect(store.load().defaultProfile).toBe('prod');
  expect(store.remove('nope')).toBe(false);
});
