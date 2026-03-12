import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RowFilter, RowFilterCondition, ExerciseColumn } from '@mapforge/shared';

const OPERATORS: { value: RowFilterCondition['operator']; label: string }[] = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'in', label: 'In (comma-sep)' },
  { value: 'not_in', label: 'Not in (comma-sep)' },
  { value: 'is_null', label: 'Is empty' },
  { value: 'is_not_null', label: 'Is not empty' },
];

const NO_VALUE_OPERATORS = new Set<string>(['is_null', 'is_not_null']);

interface RowFilterBuilderProps {
  filter: RowFilter;
  columns: ExerciseColumn[];
  onChange: (filter: RowFilter) => void;
}

export function RowFilterBuilder({ filter, columns, onChange }: RowFilterBuilderProps) {
  const updateCondition = (index: number, updates: Partial<RowFilterCondition>) => {
    const next = [...filter.conditions];
    next[index] = { ...next[index], ...updates };
    onChange({ ...filter, conditions: next });
  };

  const addCondition = () => {
    const col = columns[0]?.key ?? '';
    onChange({
      ...filter,
      conditions: [...filter.conditions, { column: col, operator: 'eq', value: '' }],
    });
  };

  const removeCondition = (index: number) => {
    onChange({
      ...filter,
      conditions: filter.conditions.filter((_, i) => i !== index),
    });
  };

  const toggleLogic = () => {
    onChange({ ...filter, logic: filter.logic === 'and' ? 'or' : 'and' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Match</span>
        <Button variant="outline" size="sm" onClick={toggleLogic} className="h-7 text-xs">
          {filter.logic === 'and' ? 'ALL' : 'ANY'}
        </Button>
        <span className="text-sm text-muted-foreground">conditions</span>
      </div>

      {filter.conditions.map((condition, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            value={condition.column}
            onValueChange={(v) => updateCondition(index, { column: v })}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={condition.operator}
            onValueChange={(v) => updateCondition(index, { operator: v as RowFilterCondition['operator'] })}
          >
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!NO_VALUE_OPERATORS.has(condition.operator) && (
            <Input
              value={condition.value ?? condition.values?.join(', ') ?? ''}
              onChange={(e) => {
                if (condition.operator === 'in' || condition.operator === 'not_in') {
                  updateCondition(index, { values: e.target.value.split(',').map((s) => s.trim()), value: undefined });
                } else {
                  updateCondition(index, { value: e.target.value, values: undefined });
                }
              }}
              className="flex-1 h-8"
              placeholder="Value"
            />
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => removeCondition(index)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addCondition}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add condition
      </Button>
    </div>
  );
}
