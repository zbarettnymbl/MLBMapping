import { describe, it, expect } from 'vitest';
import { MockBigQueryService } from '../services/mock-bigquery';

describe('MockBigQueryService', () => {
  const service = new MockBigQueryService();

  describe('listDatasets', () => {
    it('returns both datasets', () => {
      const datasets = service.listDatasets();
      expect(datasets).toEqual(['broadcast_data', 'development_data']);
    });
  });

  describe('listTables', () => {
    it('returns broadcast_data tables', () => {
      const tables = service.listTables('broadcast_data');
      expect(tables).toEqual(['broadcast_programs', 'broadcast_schedule']);
    });

    it('returns development_data tables', () => {
      const tables = service.listTables('development_data');
      expect(tables).toContain('team_rosters');
      expect(tables).toContain('player_development_stats');
      expect(tables).toContain('venues');
      expect(tables).toContain('youth_programs');
      expect(tables).toContain('participation_metrics');
      expect(tables).toContain('international_events');
    });

    it('returns empty array for unknown dataset', () => {
      const tables = service.listTables('nonexistent');
      expect(tables).toEqual([]);
    });
  });

  describe('testConnection', () => {
    it('succeeds for known table', async () => {
      const result = await service.testConnection('mlb-broadcast-analytics', 'broadcast_data', 'broadcast_programs', 'table');
      expect(result.success).toBe(true);
      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.sampleColumns).toBeDefined();
      expect(result.sampleColumns!.length).toBeGreaterThan(0);
    });

    it('fails for unknown table', async () => {
      const result = await service.testConnection('mlb-broadcast-analytics', 'broadcast_data', 'nonexistent', 'table');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('succeeds for query type referencing known table', async () => {
      const result = await service.testConnection(
        'mlb-broadcast-analytics', 'broadcast_data',
        'SELECT * FROM `mlb-broadcast-analytics.broadcast_data.broadcast_programs`', 'query'
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getSchema', () => {
    it('returns column info for known table', async () => {
      const columns = await service.getSchema('mlb-broadcast-analytics', 'broadcast_data', 'broadcast_programs');
      expect(columns.length).toBeGreaterThan(0);
      expect(columns[0]).toHaveProperty('name');
      expect(columns[0]).toHaveProperty('type');
      expect(columns[0]).toHaveProperty('mode');
    });

    it('throws for unknown table', async () => {
      await expect(
        service.getSchema('mlb-broadcast-analytics', 'broadcast_data', 'nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('previewData', () => {
    it('returns rows for known table', async () => {
      const result = await service.previewData('mlb-broadcast-analytics', 'broadcast_data', 'broadcast_programs', 'table', 5);
      expect(result.columns.length).toBeGreaterThan(0);
      expect(result.rows.length).toBeLessThanOrEqual(5);
      expect(result.totalRows).toBeGreaterThan(0);
      const firstRow = result.rows[0];
      expect(firstRow).toHaveProperty('program_id');
    });

    it('respects limit parameter', async () => {
      const result = await service.previewData('mlb-broadcast-analytics', 'broadcast_data', 'broadcast_programs', 'table', 3);
      expect(result.rows.length).toBeLessThanOrEqual(3);
    });
  });

  describe('executeQuery', () => {
    it('extracts table name from simple SELECT', async () => {
      const rows = await service.executeQuery('SELECT * FROM `mlb-broadcast-analytics.development_data.venues` LIMIT 10');
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThanOrEqual(10);
      expect(rows[0]).toHaveProperty('venue_id');
    });
  });

  describe('writeRows', () => {
    it('returns success without persisting', async () => {
      const result = await service.writeRows('mlb-broadcast-analytics', 'broadcast_data', 'broadcast_programs', [{ test: 1 }], 'append');
      expect(result.success).toBe(true);
      expect(result.rowsWritten).toBe(1);
    });
  });
});
