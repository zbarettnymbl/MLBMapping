import { describe, it, expect } from 'vitest';
import { detectSchemaDrift } from '../services/schema-drift';
import type { BigQueryColumnInfo } from '@mapforge/shared';

describe('schema drift detection', () => {
  it('detects no drift when schemas match', () => {
    const previous: BigQueryColumnInfo[] = [
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'name', type: 'STRING', mode: 'NULLABLE' },
    ];
    const report = detectSchemaDrift('ex1', previous, [...previous]);
    expect(report.hasDrift).toBe(false);
  });

  it('detects added columns', () => {
    const previous: BigQueryColumnInfo[] = [{ name: 'id', type: 'STRING', mode: 'REQUIRED' }];
    const current: BigQueryColumnInfo[] = [
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'email', type: 'STRING', mode: 'NULLABLE' },
    ];
    const report = detectSchemaDrift('ex1', previous, current);
    expect(report.hasDrift).toBe(true);
    expect(report.addedColumns).toContain('email');
  });

  it('detects removed columns', () => {
    const previous: BigQueryColumnInfo[] = [
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'legacy', type: 'STRING', mode: 'NULLABLE' },
    ];
    const current: BigQueryColumnInfo[] = [{ name: 'id', type: 'STRING', mode: 'REQUIRED' }];
    const report = detectSchemaDrift('ex1', previous, current);
    expect(report.hasDrift).toBe(true);
    expect(report.removedColumns).toContain('legacy');
  });

  it('detects type changes', () => {
    const previous: BigQueryColumnInfo[] = [{ name: 'count', type: 'STRING', mode: 'NULLABLE' }];
    const current: BigQueryColumnInfo[] = [{ name: 'count', type: 'INTEGER', mode: 'NULLABLE' }];
    const report = detectSchemaDrift('ex1', previous, current);
    expect(report.hasDrift).toBe(true);
    expect(report.typeChanges).toHaveLength(1);
    expect(report.typeChanges[0]).toEqual({ column: 'count', oldType: 'STRING', newType: 'INTEGER' });
  });
});
