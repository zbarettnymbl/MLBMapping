import { describe, it, expect } from 'vitest';
import { validatePipeline } from '../utils/pipelineValidation';
import type { PipelineNode, PipelineEdge } from '@mapforge/shared';

const makeNode = (overrides: Partial<PipelineNode> & { id: string; type: PipelineNode['type'] }): PipelineNode => ({
  label: 'Test',
  position: { x: 0, y: 0 },
  config: { nodeType: overrides.type } as any,
  ...overrides,
});

describe('validatePipeline', () => {
  it('returns error when no source node', () => {
    const nodes = [makeNode({ id: 'n1', type: 'transform' })];
    const edges: PipelineEdge[] = [];
    const errors = validatePipeline(nodes, edges, 'manual', {});
    expect(errors.some(e => e.message.includes('source'))).toBe(true);
  });

  it('returns error for orphaned nodes', () => {
    const nodes = [
      makeNode({ id: 'n1', type: 'bigquery_source' }),
      makeNode({ id: 'n2', type: 'transform' }),
    ];
    const edges: PipelineEdge[] = [];
    const errors = validatePipeline(nodes, edges, 'manual', {});
    expect(errors.some(e => e.message.includes('not connected'))).toBe(true);
  });

  it('detects cycles', () => {
    const nodes = [
      makeNode({ id: 'n1', type: 'bigquery_source' }),
      makeNode({ id: 'n2', type: 'transform' }),
    ];
    const edges: PipelineEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n1' },
    ];
    const errors = validatePipeline(nodes, edges, 'manual', {});
    expect(errors.some(e => e.message.includes('cycle'))).toBe(true);
  });

  it('returns no errors for valid pipeline', () => {
    const nodes = [
      makeNode({ id: 'n1', type: 'bigquery_source', config: { nodeType: 'bigquery_source', credentialId: 'c1', gcpProject: 'p', dataset: 'd', tableOrQuery: 't', queryType: 'table' } as any }),
      makeNode({ id: 'n2', type: 'bigquery_destination', config: { nodeType: 'bigquery_destination', credentialId: 'c1', gcpProject: 'p', dataset: 'd', tableName: 't', writeMode: 'append' } as any }),
    ];
    const edges: PipelineEdge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
    const errors = validatePipeline(nodes, edges, 'manual', {});
    expect(errors).toHaveLength(0);
  });

  it('validates cron expression when trigger is cron', () => {
    const nodes = [
      makeNode({ id: 'n1', type: 'bigquery_source', config: { nodeType: 'bigquery_source', credentialId: 'c1', gcpProject: 'p', dataset: 'd', tableOrQuery: 't', queryType: 'table' } as any }),
    ];
    const edges: PipelineEdge[] = [];
    const errors = validatePipeline(nodes, edges, 'cron', {});
    expect(errors.some(e => e.message.includes('cron'))).toBe(true);
  });
});
