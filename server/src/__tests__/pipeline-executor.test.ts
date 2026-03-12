import { describe, it, expect } from 'vitest';
import { topologicalSort } from '../services/pipeline-executor';

describe('pipeline executor', () => {
  it('sorts a linear DAG in correct order', () => {
    const nodes = [
      { id: 'a', type: 'bigquery_source', label: 'A', position: { x: 0, y: 0 }, config: {} },
      { id: 'b', type: 'enrichment_exercise', label: 'B', position: { x: 0, y: 0 }, config: {} },
      { id: 'c', type: 'bigquery_destination', label: 'C', position: { x: 0, y: 0 }, config: {} },
    ];
    const edges = [{ id: 'e1', source: 'a', target: 'b' }, { id: 'e2', source: 'b', target: 'c' }];
    const sorted = topologicalSort(nodes as any, edges);
    expect(sorted.map(n => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles branching DAG', () => {
    const nodes = [
      { id: 'src', type: 'bigquery_source', label: 'S', position: { x: 0, y: 0 }, config: {} },
      { id: 'val', type: 'validation_gate', label: 'V', position: { x: 0, y: 0 }, config: {} },
      { id: 'notify', type: 'notification', label: 'N', position: { x: 0, y: 0 }, config: {} },
      { id: 'dest', type: 'bigquery_destination', label: 'D', position: { x: 0, y: 0 }, config: {} },
    ];
    const edges = [
      { id: 'e1', source: 'src', target: 'val' },
      { id: 'e2', source: 'val', target: 'dest' },
      { id: 'e3', source: 'val', target: 'notify' },
    ];
    const sorted = topologicalSort(nodes as any, edges);
    const srcIdx = sorted.findIndex(n => n.id === 'src');
    const valIdx = sorted.findIndex(n => n.id === 'val');
    expect(srcIdx).toBeLessThan(valIdx);
  });

  it('throws on cycle', () => {
    const nodes = [
      { id: 'a', type: 'bigquery_source', label: 'A', position: { x: 0, y: 0 }, config: {} },
      { id: 'b', type: 'enrichment_exercise', label: 'B', position: { x: 0, y: 0 }, config: {} },
    ];
    const edges = [{ id: 'e1', source: 'a', target: 'b' }, { id: 'e2', source: 'b', target: 'a' }];
    expect(() => topologicalSort(nodes as any, edges)).toThrow(/cycle/i);
  });
});
