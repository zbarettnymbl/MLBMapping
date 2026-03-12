import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@google-cloud/bigquery', () => {
  const mockQuery = vi.fn();
  const mockGetMetadata = vi.fn();
  const mockInsert = vi.fn();
  const mockTable = vi.fn(() => ({ getMetadata: mockGetMetadata, insert: mockInsert }));
  const mockDataset = vi.fn(() => ({ table: mockTable }));
  const BigQuery = vi.fn(() => ({
    query: mockQuery,
    dataset: mockDataset,
  }));
  return { BigQuery, mockQuery, mockGetMetadata, mockInsert, mockDataset, mockTable };
});

import { BigQueryService } from '../services/bigquery';
import { mockGetMetadata, mockQuery } from '@google-cloud/bigquery';

describe('BigQueryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('testConnection returns success when query executes', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1, name: 'test' }]]);
    const service = new BigQueryService('{"type":"service_account"}');
    const result = await service.testConnection('project', 'dataset', 'table', 'table');
    expect(result).toHaveProperty('success', true);
    expect(result.rowCount).toBe(1);
    expect(result.sampleColumns).toHaveLength(2);
  });

  it('testConnection returns failure on error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Access denied'));
    const service = new BigQueryService('{"type":"service_account"}');
    const result = await service.testConnection('project', 'dataset', 'table', 'table');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Access denied');
  });

  it('getSchema returns column info', async () => {
    mockGetMetadata.mockResolvedValueOnce([{
      schema: {
        fields: [
          { name: 'id', type: 'INTEGER', mode: 'REQUIRED' },
          { name: 'name', type: 'STRING', mode: 'NULLABLE' },
        ],
      },
    }]);
    const service = new BigQueryService('{"type":"service_account"}');
    const schema = await service.getSchema('project', 'dataset', 'table');
    expect(Array.isArray(schema)).toBe(true);
    expect(schema).toHaveLength(2);
    expect(schema[0]).toEqual({ name: 'id', type: 'INTEGER', mode: 'REQUIRED' });
  });
});
