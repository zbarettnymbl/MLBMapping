// client/src/components/grid/__tests__/buildColumnDefs.test.ts
import { describe, it, expect } from 'vitest';
import { buildColumnDefs } from '../buildColumnDefs';
import type { ExerciseDetail, ExerciseColumn } from '@mapforge/shared/types';

function makeCol(overrides: Partial<ExerciseColumn>): ExerciseColumn {
  return {
    id: 'c1', key: 'col1', label: 'Col 1', description: null,
    dataType: 'text', columnRole: 'source', required: false,
    defaultValue: null, config: {}, validationRules: [],
    referenceLink: null, dependentConfig: null, visible: true, ordinal: 0,
    ...overrides,
  };
}

function makeExercise(
  sourceColumns: ExerciseColumn[],
  classificationColumns: ExerciseColumn[]
): ExerciseDetail {
  return {
    id: 'ex1', name: 'Test', description: '', status: 'active',
    sourceColumns, classificationColumns,
    deadline: null, lastRefreshedAt: '2026-01-01',
  };
}

describe('buildColumnDefs', () => {
  it('starts with status column pinned left', () => {
    const defs = buildColumnDefs(makeExercise([], []));
    expect(defs[0].field).toBe('__status');
    expect(defs[0].pinned).toBe('left');
    expect(defs[0].cellRenderer).toBe('rowStatusRenderer');
  });

  it('generates source columns as read-only', () => {
    const src = makeCol({ key: 'siteId', label: 'Site ID', visible: true });
    const defs = buildColumnDefs(makeExercise([src], []));
    const srcDef = defs.find((d) => d.field === 'sourceData.siteId');
    expect(srcDef).toBeDefined();
    expect(srcDef!.editable).toBe(false);
    expect(srcDef!.cellClass).toBe('source-cell');
    expect(srcDef!.headerComponent).toBe('sourceColumnHeader');
  });

  it('inserts separator column between source and classification', () => {
    const src = makeCol({ key: 's1', visible: true });
    const cls = makeCol({ key: 'c1', columnRole: 'classification', visible: true });
    const defs = buildColumnDefs(makeExercise([src], [cls]));
    // status, source, separator, classification
    expect(defs[2].cellClass).toBe('separator-cell');
    expect(defs[2].width).toBe(4);
  });

  it('maps picklist to dependentPicklistEditor', () => {
    const cls = makeCol({ key: 'sport', dataType: 'picklist', columnRole: 'classification', visible: true });
    const defs = buildColumnDefs(makeExercise([], [cls]));
    const col = defs.find((d) => d.field === 'classifications.sport');
    expect(col!.cellEditor).toBe('dependentPicklistEditor');
    expect(col!.cellEditorPopup).toBe(true);
  });

  it('maps number to agNumberCellEditor with min/max', () => {
    const cls = makeCol({
      key: 'weight', dataType: 'number', columnRole: 'classification',
      config: { minValue: 0, maxValue: 10 }, visible: true,
    });
    const defs = buildColumnDefs(makeExercise([], [cls]));
    const col = defs.find((d) => d.field === 'classifications.weight');
    expect(col!.cellEditor).toBe('agNumberCellEditor');
    expect(col!.cellEditorParams).toEqual({ min: 0, max: 10 });
  });

  it('maps date to dateCellEditor popup', () => {
    const cls = makeCol({ key: 'd1', dataType: 'date', columnRole: 'classification', visible: true });
    const defs = buildColumnDefs(makeExercise([], [cls]));
    const col = defs.find((d) => d.field === 'classifications.d1');
    expect(col!.cellEditor).toBe('dateCellEditor');
    expect(col!.cellEditorPopup).toBe(true);
  });

  it('maps boolean to custom renderer and editor', () => {
    const cls = makeCol({ key: 'b1', dataType: 'boolean', columnRole: 'classification', visible: true });
    const defs = buildColumnDefs(makeExercise([], [cls]));
    const col = defs.find((d) => d.field === 'classifications.b1');
    expect(col!.cellEditor).toBe('booleanCellEditor');
    expect(col!.cellRenderer).toBe('booleanCellRenderer');
  });

  it('maps multi_select to multiSelectEditor popup', () => {
    const cls = makeCol({ key: 'm1', dataType: 'multi_select', columnRole: 'classification', visible: true });
    const defs = buildColumnDefs(makeExercise([], [cls]));
    const col = defs.find((d) => d.field === 'classifications.m1');
    expect(col!.cellEditor).toBe('multiSelectEditor');
    expect(col!.cellEditorPopup).toBe(true);
  });

  it('excludes hidden columns', () => {
    const hidden = makeCol({ key: 'secret', visible: false });
    const defs = buildColumnDefs(makeExercise([hidden], []));
    expect(defs.find((d) => d.field === 'sourceData.secret')).toBeUndefined();
  });

  it('renders computed columns as read-only with source-cell style', () => {
    const computed = makeCol({ key: 'comp', columnRole: 'computed', visible: true });
    const defs = buildColumnDefs(makeExercise([], [computed]));
    const col = defs.find((d) => d.field === 'classifications.comp');
    expect(col!.editable).toBe(false);
    expect(col!.cellClass).toBe('source-cell');
  });
});
