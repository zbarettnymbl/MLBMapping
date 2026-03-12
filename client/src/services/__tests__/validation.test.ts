// client/src/services/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateCell } from '../validation';
import type { ExerciseColumn, EnrichmentRecord } from '@mapforge/shared/types';

const baseRecord: EnrichmentRecord = {
  id: 'r1',
  uniqueKey: {},
  sourceData: {},
  classifications: {},
  recordState: 'new',
  validationErrors: [],
  isFullyClassified: false,
};

function makeColumn(overrides: Partial<ExerciseColumn>): ExerciseColumn {
  return {
    id: 'c1',
    key: 'testCol',
    label: 'Test Column',
    description: null,
    dataType: 'text',
    columnRole: 'classification',
    required: false,
    defaultValue: null,
    config: {},
    validationRules: [],
    referenceLink: null,
    dependentConfig: null,
    visible: true,
    ordinal: 0,
    ...overrides,
  };
}

describe('validateCell', () => {
  describe('required', () => {
    const col = makeColumn({ required: true, label: 'Sport' });

    it('returns error for null', () => {
      const errors = validateCell(null, col, baseRecord);
      expect(errors).toHaveLength(1);
      expect(errors[0].ruleType).toBe('required');
      expect(errors[0].message).toBe('Sport is required');
    });

    it('returns error for empty string', () => {
      const errors = validateCell('', col, baseRecord);
      expect(errors).toHaveLength(1);
      expect(errors[0].ruleType).toBe('required');
    });

    it('passes for non-empty value', () => {
      const errors = validateCell('Baseball', col, baseRecord);
      expect(errors).toHaveLength(0);
    });
  });

  describe('number range', () => {
    const col = makeColumn({
      dataType: 'number',
      config: { minValue: 1, maxValue: 100 },
    });

    it('returns error for non-numeric', () => {
      const errors = validateCell('abc', col, baseRecord);
      expect(errors[0].ruleType).toBe('type');
    });

    it('returns error for below min', () => {
      const errors = validateCell('0', col, baseRecord);
      expect(errors[0].ruleType).toBe('range');
      expect(errors[0].message).toContain('Minimum');
    });

    it('returns error for above max', () => {
      const errors = validateCell('101', col, baseRecord);
      expect(errors[0].ruleType).toBe('range');
      expect(errors[0].message).toContain('Maximum');
    });

    it('passes for valid number', () => {
      expect(validateCell('50', col, baseRecord)).toHaveLength(0);
    });

    it('passes at boundary values', () => {
      expect(validateCell('1', col, baseRecord)).toHaveLength(0);
      expect(validateCell('100', col, baseRecord)).toHaveLength(0);
    });
  });

  describe('picklist enum', () => {
    const col = makeColumn({
      dataType: 'picklist',
      config: { picklistValues: ['Baseball', 'Softball', 'T-Ball'] },
    });

    it('returns error for invalid option', () => {
      const errors = validateCell('Hockey', col, baseRecord);
      expect(errors[0].ruleType).toBe('enum');
      expect(errors[0].message).toContain('"Hockey" is not a valid option');
    });

    it('passes for valid option', () => {
      expect(validateCell('Baseball', col, baseRecord)).toHaveLength(0);
    });
  });

  describe('regex', () => {
    const col = makeColumn({
      dataType: 'text',
      config: { regexPattern: '^[A-Z]{3}-\\d{4}$' },
      validationRules: [
        { type: 'regex', config: {}, severity: 'error', message: 'Must match format XXX-0000' },
      ],
    });

    it('returns error for non-matching value', () => {
      const errors = validateCell('abc', col, baseRecord);
      expect(errors[0].ruleType).toBe('regex');
      expect(errors[0].message).toBe('Must match format XXX-0000');
    });

    it('passes for matching value', () => {
      expect(validateCell('ABC-1234', col, baseRecord)).toHaveLength(0);
    });
  });

  describe('non-required empty', () => {
    it('skips type checks for null on optional column', () => {
      const col = makeColumn({ dataType: 'number', config: { minValue: 1 } });
      expect(validateCell(null, col, baseRecord)).toHaveLength(0);
    });

    it('skips type checks for empty string on optional column', () => {
      const col = makeColumn({ dataType: 'picklist', config: { picklistValues: ['A'] } });
      expect(validateCell('', col, baseRecord)).toHaveLength(0);
    });
  });
});
