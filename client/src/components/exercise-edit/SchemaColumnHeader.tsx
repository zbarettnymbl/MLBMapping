import { forwardRef } from 'react';
import type { IHeaderParams } from 'ag-grid-community';
import { List, Hash, Calendar, Type, ToggleLeft, Layers, Pencil, Link } from 'lucide-react';
import type { ExerciseColumn } from '@mapforge/shared';

const DATA_TYPE_ICONS: Record<string, typeof Type> = {
  picklist: List,
  multi_select: Layers,
  number: Hash,
  date: Calendar,
  boolean: ToggleLeft,
  text: Type,
};

interface SchemaColumnHeaderParams extends IHeaderParams {
  exerciseColumn: ExerciseColumn;
  onHeaderClick: (column: ExerciseColumn) => void;
}

export const SchemaColumnHeader = forwardRef<HTMLDivElement, SchemaColumnHeaderParams>(
  function SchemaColumnHeader(props, ref) {
    const { exerciseColumn: col, onHeaderClick } = props;
    const Icon = DATA_TYPE_ICONS[col.dataType] || Type;
    const hasReferenceLink = !!col.referenceLink;

    return (
      <div
        ref={ref}
        className="flex items-center gap-1.5 w-full cursor-pointer group px-1"
        onClick={() => onHeaderClick(col)}
        title={`Click to edit "${col.label}"`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs font-medium">{col.label}</span>
        {col.required && <span className="text-destructive text-xs">*</span>}
        {hasReferenceLink && <Link className="h-3 w-3 shrink-0 text-blue-400" />}
        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
      </div>
    );
  }
);
