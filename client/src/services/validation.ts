// client/src/services/validation.ts
import type { ExerciseColumn, EnrichmentRecord, CellError } from '@mapforge/shared/types';

export function validateCell(
  value: string | null,
  column: ExerciseColumn,
  record: EnrichmentRecord
): CellError[] {
  const errors: CellError[] = [];

  // Required check
  if (column.required && (value === null || value === '')) {
    errors.push({
      columnKey: column.key,
      severity: 'error',
      message: `${column.label} is required`,
      ruleType: 'required',
    });
  }

  if (value === null || value === '') return errors;

  switch (column.dataType) {
    case 'number': {
      const num = parseFloat(value);
      if (isNaN(num)) {
        errors.push({
          columnKey: column.key,
          severity: 'error',
          message: 'Must be a number',
          ruleType: 'type',
        });
      } else {
        if (column.config.minValue !== undefined && num < column.config.minValue) {
          errors.push({
            columnKey: column.key,
            severity: 'error',
            message: `Minimum value is ${column.config.minValue}`,
            ruleType: 'range',
          });
        }
        if (column.config.maxValue !== undefined && num > column.config.maxValue) {
          errors.push({
            columnKey: column.key,
            severity: 'error',
            message: `Maximum value is ${column.config.maxValue}`,
            ruleType: 'range',
          });
        }
      }
      break;
    }
    case 'picklist': {
      if (
        column.config.picklistValues &&
        !column.config.picklistValues.includes(value)
      ) {
        errors.push({
          columnKey: column.key,
          severity: 'error',
          message: `"${value}" is not a valid option`,
          ruleType: 'enum',
        });
      }
      break;
    }
    case 'text': {
      if (
        column.config.regexPattern &&
        !new RegExp(column.config.regexPattern).test(value)
      ) {
        errors.push({
          columnKey: column.key,
          severity: 'error',
          message:
            column.validationRules.find((r) => r.type === 'regex')?.message ||
            'Invalid format',
          ruleType: 'regex',
        });
      }
      break;
    }
  }

  return errors;
}
