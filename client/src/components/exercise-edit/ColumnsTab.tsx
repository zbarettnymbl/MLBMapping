import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDeleteColumn } from '@/hooks/useExerciseEdit';
import type { ExerciseDetail, ExerciseColumn } from '@mapforge/shared';

interface ColumnsTabProps {
  exerciseId: string;
  exercise: ExerciseDetail;
  onDirtyChange: (dirty: boolean) => void;
}

function ColumnRow({ col, onDelete }: { col: ExerciseColumn; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md border border-border">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{col.label}</p>
          <p className="text-xs text-muted-foreground">{col.key} -- {col.dataType}{col.required ? ' (required)' : ''}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-xs">{col.columnRole}</Badge>
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ColumnsTab({ exerciseId, exercise, onDirtyChange: _onDirtyChange }: ColumnsTabProps) {
  const deleteColumn = useDeleteColumn(exerciseId);
  const [deleteTarget, setDeleteTarget] = useState<ExerciseColumn | null>(null);

  const sourceColumns = exercise.sourceColumns ?? [];
  const classificationColumns = exercise.classificationColumns ?? [];

  return (
    <div className="space-y-6 pt-4">
      {/* Source Columns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source Columns ({sourceColumns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sourceColumns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No source columns configured.</p>
          ) : (
            <div className="space-y-2">
              {sourceColumns.map((col) => (
                <ColumnRow key={col.id} col={col} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classification Columns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classification Columns ({classificationColumns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {classificationColumns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classification columns configured.</p>
          ) : (
            <div className="space-y-2">
              {classificationColumns.map((col) => (
                <ColumnRow
                  key={col.id}
                  col={col}
                  onDelete={() => setDeleteTarget(col)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete column"
        description={`Are you sure you want to delete the column "${deleteTarget?.label}"? This will remove all classification values for this column.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteColumn.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteColumn.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </div>
  );
}
