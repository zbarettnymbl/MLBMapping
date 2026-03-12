import { describe, it, expect } from 'vitest';
import { parseCsvBuffer } from '../services/csv-import';

describe('CSV import', () => {
  it('parses a simple CSV into rows with auto-detected columns', async () => {
    const csv = Buffer.from('name,code,parent\nBaseball,BB,\nSoftball,SB,\n');
    const result = parseCsvBuffer(csv);
    expect(result.columns).toEqual([
      { key: 'name', label: 'name', type: 'text' },
      { key: 'code', label: 'code', type: 'text' },
      { key: 'parent', label: 'parent', type: 'text' },
    ]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].data).toEqual({ name: 'Baseball', code: 'BB', parent: '' });
  });

  it('handles empty CSV gracefully', () => {
    const csv = Buffer.from('');
    const result = parseCsvBuffer(csv);
    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('trims whitespace from headers and values', () => {
    const csv = Buffer.from(' name , code \n Baseball , BB \n');
    const result = parseCsvBuffer(csv);
    expect(result.columns[0].key).toBe('name');
    expect(result.rows[0].data.name).toBe('Baseball');
  });
});
