import { describe, expect, test } from 'bun:test';
import { type ClipboardIo, copyToClipboard } from './clipboard';

/** A fake io that records tool runs and terminal writes. */
interface FakeIo {
  /** The io under test. */
  io: ClipboardIo;
  /** The commands run, with their arguments. */
  ran: string[][];
  /** The escape sequences written. */
  wrote: string[];
}

/**
 * Builds a fake io whose listed commands succeed.
 *
 * @param platform - The reported platform.
 * @param working - The commands that report success.
 * @returns The fake io and its recorders.
 */
function fakeIo(platform: NodeJS.Platform, working: string[]): FakeIo {
  const ran: string[][] = [];
  const wrote: string[] = [];
  return {
    io: {
      run: (command, args): boolean => {
        ran.push([command, ...args]);
        return working.includes(command);
      },
      write: (data): void => {
        wrote.push(data);
      },
      platform,
    },
    ran,
    wrote,
  };
}

describe('copyToClipboard', () => {
  test('uses pbcopy on macOS', () => {
    const fake = fakeIo('darwin', ['pbcopy']);
    expect(copyToClipboard('hello', fake.io)).toBe('tool');
    expect(fake.ran).toEqual([['pbcopy']]);
    expect(fake.wrote).toEqual([]);
  });

  test('tries the linux tools in order until one works', () => {
    const fake = fakeIo('linux', ['clip.exe']);
    expect(copyToClipboard('hello', fake.io)).toBe('tool');
    expect(fake.ran.map((call) => call[0])).toEqual([
      'wl-copy',
      'xclip',
      'clip.exe',
    ]);
    expect(fake.wrote).toEqual([]);
  });

  test('passes the clipboard selection to xclip', () => {
    const fake = fakeIo('linux', ['xclip']);
    copyToClipboard('hello', fake.io);
    expect(fake.ran).toContainEqual(['xclip', '-selection', 'clipboard']);
  });

  test('falls back to OSC 52 when no tool works', () => {
    const fake = fakeIo('linux', []);
    expect(copyToClipboard('hello', fake.io)).toBe('osc52');
    expect(fake.wrote).toEqual([
      `\u001B]52;c;${Buffer.from('hello').toString('base64')}\u0007`,
    ]);
  });

  test('goes straight to OSC 52 on a platform without tools', () => {
    const fake = fakeIo('freebsd', ['pbcopy']);
    expect(copyToClipboard('hello', fake.io)).toBe('osc52');
    expect(fake.ran).toEqual([]);
    expect(fake.wrote).toHaveLength(1);
  });
});
