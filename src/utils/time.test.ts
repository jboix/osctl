import { describe, expect, test } from 'bun:test';
import { compactStamp, readableStamp } from './time';

describe('compactStamp', () => {
  test('formats a time with padded fields', () => {
    expect(compactStamp(new Date(2026, 7, 8, 9, 5, 3))).toBe('20260808-090503');
  });
});

describe('readableStamp', () => {
  test('expands a compact stamp', () => {
    expect(readableStamp('20260808-090503')).toBe('2026-08-08 09:05:03');
  });

  test('returns a non-matching input unchanged', () => {
    expect(readableStamp('not-a-stamp')).toBe('not-a-stamp');
  });
});
