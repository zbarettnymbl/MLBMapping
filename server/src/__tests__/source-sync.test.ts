import { describe, it, expect } from 'vitest';
import { diffRecords } from '../services/source-sync';

describe('source-sync diffRecords', () => {
  const uniqueKeyColumns = ['siteId', 'programId'];

  it('identifies new records not in local store', () => {
    const sourceRows = [
      { siteId: '1', programId: 'A', name: 'Program A' },
      { siteId: '2', programId: 'B', name: 'Program B' },
    ];
    const existingRecords: Array<{ uniqueKey: Record<string, string>; sourceData: Record<string, unknown>; id: string }> = [];
    const diff = diffRecords(sourceRows, existingRecords, uniqueKeyColumns);
    expect(diff.newRecords).toHaveLength(2);
    expect(diff.changedRecords).toHaveLength(0);
    expect(diff.removedRecords).toHaveLength(0);
    expect(diff.unchangedRecords).toHaveLength(0);
  });

  it('identifies unchanged records', () => {
    const sourceRows = [{ siteId: '1', programId: 'A', name: 'Same' }];
    const existingRecords = [{ id: 'r1', uniqueKey: { siteId: '1', programId: 'A' }, sourceData: { siteId: '1', programId: 'A', name: 'Same' } }];
    const diff = diffRecords(sourceRows, existingRecords, uniqueKeyColumns);
    expect(diff.newRecords).toHaveLength(0);
    expect(diff.unchangedRecords).toHaveLength(1);
  });

  it('identifies changed records when source data differs', () => {
    const sourceRows = [{ siteId: '1', programId: 'A', name: 'Updated' }];
    const existingRecords = [{ id: 'r1', uniqueKey: { siteId: '1', programId: 'A' }, sourceData: { siteId: '1', programId: 'A', name: 'Old' } }];
    const diff = diffRecords(sourceRows, existingRecords, uniqueKeyColumns);
    expect(diff.changedRecords).toHaveLength(1);
    expect(diff.changedRecords[0].id).toBe('r1');
  });

  it('identifies removed records not in source', () => {
    const sourceRows: Record<string, unknown>[] = [];
    const existingRecords = [{ id: 'r1', uniqueKey: { siteId: '1', programId: 'A' }, sourceData: { siteId: '1', programId: 'A', name: 'Gone' } }];
    const diff = diffRecords(sourceRows, existingRecords, uniqueKeyColumns);
    expect(diff.removedRecords).toHaveLength(1);
  });
});
