import { expect, test } from 'bun:test';
import {
  aliasActionLines,
  aliasReferenceLines,
  EDIT_KINDS,
  editHeaderLines,
  editSkeleton,
} from './edit-content';

test('editSkeleton returns valid JSON for every kind', () => {
  for (const kind of EDIT_KINDS) {
    expect(() => JSON.parse(editSkeleton(kind))).not.toThrow();
  }
});

test('editHeaderLines names the target and links the docs', () => {
  const lines = editHeaderLines('template', 'core_events');
  expect(lines[0]).toContain('core_events');
  expect(lines.join('\n')).toContain('https://');
});

test('editHeaderLines appends the extra reference lines', () => {
  const lines = editHeaderLines('alias', undefined, ['Current aliases:']);
  expect(lines.at(-1)).toBe('Current aliases:');
});

test('aliasActionLines describes add and remove actions', () => {
  const lines = aliasActionLines({
    actions: [
      {
        add: { index: 'events-000002', alias: 'events', is_write_index: true },
      },
      { remove: { index: 'events-000001', alias: 'user_events' } },
      { remove_index: { index: 'old-000001' } },
    ],
  });
  expect(lines).toEqual([
    { sign: '+', text: 'add events-000002 to events (write)' },
    { sign: '-', text: 'remove events-000001 from user_events' },
    { sign: '-', text: 'remove_index old-000001' },
  ]);
});

test('aliasActionLines marks filtered actions and accepts a bare array', () => {
  const lines = aliasActionLines([
    { add: { index: 'a', alias: 'b', filter: { term: { robot: false } } } },
  ]);
  expect(lines).toEqual([{ sign: '+', text: 'add a to b (filtered)' }]);
});

test('aliasActionLines falls back to raw JSON for unknown shapes', () => {
  expect(aliasActionLines({ nope: true })).toEqual([
    { sign: ' ', text: '{"nope":true}' },
  ]);
  expect(aliasActionLines({ actions: ['what'] })).toEqual([
    { sign: ' ', text: '"what"' },
  ]);
});

test('aliasReferenceLines lists the alias names on one line', () => {
  const lines = aliasReferenceLines([
    {
      name: 'events',
      targets: [
        { index: 'events-000001', write: false, filtered: false },
        { index: 'events-000002', write: true, filtered: false },
      ],
    },
    {
      name: 'user_events',
      targets: [{ index: 'events-000002', write: false, filtered: true }],
    },
  ]);
  expect(lines).toEqual(['Existing aliases: events, user_events']);
});

test('aliasReferenceLines returns nothing without aliases', () => {
  expect(aliasReferenceLines([])).toEqual([]);
});
