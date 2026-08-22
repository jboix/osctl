// Saves and lists the document backups written before an apply overwrites.

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { compactStamp } from '../../utils/time';

/** The resource kinds a backup can hold. */
export type BackupType = 'template' | 'policy' | 'alias' | 'cluster';

/** The backup types, used to validate directory names. */
const BACKUP_TYPES: BackupType[] = ['template', 'policy', 'alias', 'cluster'];

/** One backup on disk. */
export interface BackupInfo {
  /** The identifier: `<type>/<name>-<stamp>`. */
  id: string;
  /** The resource kind. */
  type: BackupType;
  /** The document name; `aliases` for alias table snapshots. */
  name: string;
  /** The save time, `YYYYMMDD-HHMMSS` local time. */
  stamp: string;
}

/** The backups kept per document when no retention is given. */
const DEFAULT_RETENTION = 20;

/** Matches `<name>-<stamp>.json` and captures the name and the stamp. */
const FILE_PATTERN = /^(.+)-(\d{8}-\d{6})\.json$/;

/**
 * Returns the default backup root directory.
 *
 * @returns The path `~/.config/osctl/backups`.
 */
function defaultBackupRoot(): string {
  return join(homedir(), '.config', 'osctl', 'backups');
}

/** Saves, lists, reads, and deletes the backups of one profile. */
export class BackupStore {
  /** The directory holding this profile's backups. */
  private readonly directory: string;
  /** The backups kept per document. Older ones are pruned on save. */
  private readonly retention: number;

  /**
   * Creates a store for one profile.
   *
   * @param profile - The profile whose backups the store manages.
   * @param root - The backup root, `~/.config/osctl/backups` when omitted.
   * @param retention - The backups kept per document, 20 when omitted.
   */
  constructor(
    profile: string,
    root: string = defaultBackupRoot(),
    retention: number = DEFAULT_RETENTION,
  ) {
    this.directory = join(root, profile);
    this.retention = retention;
  }

  /**
   * Writes a backup and prunes the oldest ones beyond the retention cap.
   *
   * @param type - The resource kind.
   * @param name - The document name.
   * @param body - The document body, pretty printed JSON.
   * @returns The written backup.
   */
  save(type: BackupType, name: string, body: string): BackupInfo {
    const stamp = compactStamp(new Date());
    const directory = join(this.directory, type);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `${name}-${stamp}.json`), `${body}\n`, {
      mode: 0o600,
    });
    this.prune(type, name);
    return { id: `${type}/${name}-${stamp}`, type, name, stamp };
  }

  /**
   * Lists the profile's backups, newest first by file modification time.
   *
   * @returns The backups.
   */
  list(): BackupInfo[] {
    const backups: { info: BackupInfo; modified: number }[] = [];
    for (const type of BACKUP_TYPES) {
      const directory = join(this.directory, type);
      for (const file of readFileNames(directory)) {
        const info = parseFile(type, file);
        if (info !== undefined) {
          backups.push({ info, modified: modifiedAt(join(directory, file)) });
        }
      }
    }
    return backups
      .sort(
        (a, b) => b.modified - a.modified || a.info.id.localeCompare(b.info.id),
      )
      .map((backup) => backup.info);
  }

  /**
   * Reads a backup body.
   *
   * @param id - The backup identifier.
   * @returns The body, or undefined when the backup does not exist.
   */
  read(id: string): string | undefined {
    const path = this.pathOf(id);
    if (path === undefined) {
      return undefined;
    }
    try {
      return readFileSync(path, 'utf8').replace(/\n$/, '');
    } catch {
      return undefined;
    }
  }

  /**
   * Deletes a backup.
   *
   * @param id - The backup identifier.
   * @returns Whether a backup was deleted.
   */
  remove(id: string): boolean {
    const path = this.pathOf(id);
    if (path === undefined) {
      return false;
    }
    try {
      rmSync(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolves a backup identifier to its file path.
   *
   * @param id - The backup identifier.
   * @returns The path, or undefined when the identifier is malformed.
   */
  private pathOf(id: string): string | undefined {
    const [type, ...rest] = id.split('/');
    const file = rest.join('/');
    if (type === undefined || file === '' || file.includes('..')) {
      return undefined;
    }
    return join(this.directory, type, `${file}.json`);
  }

  /**
   * Deletes the oldest backups of one document beyond the retention cap.
   *
   * @param type - The resource kind.
   * @param name - The document name.
   * @returns Nothing.
   */
  private prune(type: BackupType, name: string): void {
    const versions = this.list().filter(
      (backup) => backup.type === type && backup.name === name,
    );
    for (const backup of versions.slice(this.retention)) {
      this.remove(backup.id);
    }
  }
}

/**
 * Reads the modification time of a file.
 *
 * @param path - The file path.
 * @returns The modification time in milliseconds, 0 when unreadable.
 */
function modifiedAt(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Parses a backup file name into its info.
 *
 * @param type - The resource kind.
 * @param file - The file name.
 * @returns The info, or undefined when the name does not match.
 */
function parseFile(type: BackupType, file: string): BackupInfo | undefined {
  const match = FILE_PATTERN.exec(file);
  const [, name, stamp] = match ?? [];
  if (name === undefined || stamp === undefined) {
    return undefined;
  }
  return { id: `${type}/${name}-${stamp}`, type, name, stamp };
}

/**
 * Lists the file names of a directory.
 *
 * @param path - The directory path.
 * @returns The names, empty when the directory does not exist.
 */
function readFileNames(path: string): string[] {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}
