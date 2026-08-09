import { describe, expect, test } from 'bun:test';
import { formatBytes } from './format';

describe('formatBytes', () => {
  test('keeps byte counts unrounded', () => {
    expect(formatBytes(512)).toBe('512 b');
  });

  test('scales to the largest fitting unit', () => {
    expect(formatBytes(1536)).toBe('1.5 kb');
    expect(formatBytes(1024 * 1024)).toBe('1.0 mb');
  });
});
