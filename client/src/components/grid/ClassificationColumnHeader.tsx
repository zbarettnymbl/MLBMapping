// client/src/components/grid/ClassificationColumnHeader.tsx
import { forwardRef } from 'react';
import type { IHeaderParams } from 'ag-grid-community';
import { List, Hash, Calendar, Type, ToggleLeft, CheckSquare } from 'lucide-react';
import type { ExerciseColumn } from '@mapforge/shared/types';

const DATA_TYPE_ICONS: Record<string, React.ElementType> = {
  picklist: List,
  number: Hash,
  date: Calendar,
  text: Type,
  boolean: ToggleLeft,
  multi_select: CheckSquare,
};

interface ClassificationColumnHeaderProps extends IHeaderParams {
  exerciseColumn: ExerciseColumn;
}

export const ClassificationColumnHeader = forwardRef<
  HTMLDivElement,
  ClassificationColumnHeaderProps
>(function ClassificationColumnHeader(props, ref) {
  const col = props.exerciseColumn;
  const Icon = DATA_TYPE_ICONS[col.dataType] || Type;

  const tooltipLines = [col.description || col.label, `Type: ${col.dataType}`];
  if (col.required) tooltipLines.push('Required');
  if (col.validationRules.length > 0) {
    tooltipLines.push(
      `Validation: ${col.validationRules.map((r) => r.type).join(', ')}`
    );
  }

  return (
    <div
      ref={ref}
      className={[
        'flex items-center gap-1.5 px-2 w-full h-full',
        'text-foreground text-xs font-semibold',
      ].join(' ')}
      title={tooltipLines.join('\n')}
    >
      <Icon size={12} className="text-muted-foreground shrink-0" />
      <span className="truncate">{props.displayName}</span>
      {col.required && (
        <span className="text-amber-400 text-[10px] font-bold shrink-0">*</span>
      )}
    </div>
  );
});
