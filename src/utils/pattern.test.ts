import { describe, expect, test } from 'bun:test';
import { matchesPattern } from './pattern';

describe('matchesPattern', () => {
  test('matches everything when the pattern is omitted', () => {
    expect(matchesPattern('anything')).toBe(true);
  });

  test('matches whole names, not substrings', () => {
    expect(matchesPattern('logs', 'log')).toBe(false);
    expect(matchesPattern('logs', 'logs')).toBe(true);
  });

  test('expands * to any run of characters', () => {
    expect(matchesPattern('logs-000001', 'logs-*')).toBe(true);
    expect(matchesPattern('metrics-000001', 'logs-*')).toBe(false);
  });

  test('escapes regex characters in the pattern', () => {
    expect(matchesPattern('a.b', 'a.b')).toBe(true);
    expect(matchesPattern('axb', 'a.b')).toBe(false);
  });
});
