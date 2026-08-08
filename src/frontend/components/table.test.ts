import { describe, expect, test } from 'bun:test';
import { tableLines } from './table';

describe('tableLines', () => {
  test('pads columns to their widest cell and trims the line end', () => {
    const lines = tableLines({
      columns: [{ label: 'name' }, { label: 'size', alignRight: true }],
      rows: [
        ['logs-000001', '1gb'],
        ['a', '12mb'],
      ],
    });
    expect(lines).toEqual([
      'name         size',
      'logs-000001   1gb',
      'a            12mb',
    ]);
  });

  test('uses the header width when it is the widest', () => {
    const lines = tableLines({
      columns: [{ label: 'template' }],
      rows: [['t1']],
    });
    expect(lines).toEqual(['template', 't1']);
  });
});
