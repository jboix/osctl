import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BackupStore } from './backups';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'osctl-backups-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/**
 * Writes a backup file directly, with a controlled modification time.
 *
 * @param profile - The profile directory.
 * @param type - The type directory.
 * @param file - The file name.
 * @param age - The modification time, seconds since the epoch.
 */
function plantFile(
  profile: string,
  type: string,
  file: string,
  age: number,
): void {
  const directory = join(root, profile, type);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, file);
  writeFileSync(path, '{}\n');
  utimesSync(path, age, age);
}

describe('BackupStore', () => {
  test('saves and reads a backup body', () => {
    const store = new BackupStore('prod', root);
    const info = store.save('template', 'logs-template', '{\n  "a": 1\n}');
    expect(info.type).toBe('template');
    expect(info.name).toBe('logs-template');
    expect(info.id).toBe(`template/logs-template-${info.stamp}`);
    expect(store.read(info.id)).toBe('{\n  "a": 1\n}');
  });

  test('parses names containing dashes', () => {
    const store = new BackupStore('prod', root);
    const info = store.save('policy', 'logs-30d-delete', '{}');
    const listed = store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe('logs-30d-delete');
    expect(listed[0]?.stamp).toBe(info.stamp);
  });

  test('lists only the backups of its own profile', () => {
    new BackupStore('prod', root).save('template', 'a', '{}');
    new BackupStore('staging', root).save('template', 'b', '{}');
    const names = new BackupStore('prod', root).list().map((b) => b.name);
    expect(names).toEqual(['a']);
  });

  test('lists newest first by modification time', () => {
    plantFile('prod', 'template', 'old-20260101-000000.json', 1_000);
    plantFile('prod', 'template', 'new-20260102-000000.json', 2_000);
    plantFile('prod', 'policy', 'mid-20260101-120000.json', 1_500);
    const names = new BackupStore('prod', root).list().map((b) => b.name);
    expect(names).toEqual(['new', 'mid', 'old']);
  });

  test('ignores files that do not match the backup pattern', () => {
    plantFile('prod', 'template', 'notes.txt', 1_000);
    plantFile('prod', 'template', 'no-stamp.json', 1_000);
    expect(new BackupStore('prod', root).list()).toEqual([]);
  });

  test('prunes the oldest versions beyond the retention cap', () => {
    plantFile('prod', 'policy', 'p-20260101-000000.json', 1_000);
    plantFile('prod', 'policy', 'p-20260102-000000.json', 2_000);
    plantFile('prod', 'policy', 'other-20260101-000000.json', 1_000);
    const store = new BackupStore('prod', root, 2);
    store.save('policy', 'p', '{}');
    const stamps = store
      .list()
      .filter((b) => b.name === 'p')
      .map((b) => b.stamp);
    expect(stamps).toHaveLength(2);
    expect(stamps).not.toContain('20260101-000000');
    expect(store.list().filter((b) => b.name === 'other')).toHaveLength(1);
  });

  test('saves and lists cluster settings backups', () => {
    const store = new BackupStore('prod', root);
    const info = store.save('cluster', 'settings', '{}');
    expect(info.id).toBe(`cluster/settings-${info.stamp}`);
    expect(store.list().map((b) => b.type)).toEqual(['cluster']);
  });

  test('removes a backup and reports a missing one', () => {
    const store = new BackupStore('prod', root);
    const info = store.save('alias', 'aliases', '[]');
    expect(store.remove(info.id)).toBe(true);
    expect(store.remove(info.id)).toBe(false);
    expect(store.list()).toEqual([]);
  });

  test('returns undefined for a missing or malformed id', () => {
    const store = new BackupStore('prod', root);
    expect(store.read('template/missing-20260101-000000')).toBeUndefined();
    expect(store.read('template/../../etc/passwd')).toBeUndefined();
    expect(store.read('template')).toBeUndefined();
  });

  test('lists nothing when the root does not exist', () => {
    expect(new BackupStore('prod', join(root, 'absent')).list()).toEqual([]);
  });
});
