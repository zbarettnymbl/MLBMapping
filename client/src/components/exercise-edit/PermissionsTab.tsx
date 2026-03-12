import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useExerciseAssignments,
  useAssignmentPermissions,
  useUpdatePermissions,
} from '@/hooks/useExerciseEdit';
import { RowFilterBuilder } from './RowFilterBuilder';
import { ManualRowPicker } from './ManualRowPicker';
import type { ExerciseDetail, RowFilter, ManualRowOverrides } from '@mapforge/shared';

interface PermissionsTabProps {
  exerciseId: string;
  exercise: ExerciseDetail;
}

const EMPTY_FILTER: RowFilter = { conditions: [], logic: 'and' };
const EMPTY_OVERRIDES: ManualRowOverrides = { include: [], exclude: [] };

export function PermissionsTab({ exerciseId, exercise }: PermissionsTabProps) {
  const { data: assignments = [] } = useExerciseAssignments(exerciseId);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const { data: permissions, isLoading: permLoading } = useAssignmentPermissions(exerciseId, selectedAssignmentId);
  const updatePermissions = useUpdatePermissions(exerciseId);

  const [allowedColumnIds, setAllowedColumnIds] = useState<string[] | null>(null);
  const [rowFilter, setRowFilter] = useState<RowFilter>(EMPTY_FILTER);
  const [manualOverrides, setManualOverrides] = useState<ManualRowOverrides>(EMPTY_OVERRIDES);

  // Sync state when permissions load
  useEffect(() => {
    if (permissions) {
      setAllowedColumnIds(permissions.allowedColumnIds);
      setRowFilter(permissions.rowFilter ?? EMPTY_FILTER);
      setManualOverrides(permissions.manualRowOverrides ?? EMPTY_OVERRIDES);
    } else if (permissions === null && selectedAssignmentId) {
      // No permissions record yet - reset to defaults
      setAllowedColumnIds(null);
      setRowFilter(EMPTY_FILTER);
      setManualOverrides(EMPTY_OVERRIDES);
    }
  }, [permissions, selectedAssignmentId]);

  const allColumns = [...(exercise.sourceColumns ?? []), ...(exercise.classificationColumns ?? [])];

  const toggleColumn = (colId: string) => {
    if (allowedColumnIds === null) {
      // Currently all allowed -> restrict to all except this one
      const all = allColumns.map((c) => c.id).filter((id) => id !== colId);
      setAllowedColumnIds(all);
    } else if (allowedColumnIds.includes(colId)) {
      const next = allowedColumnIds.filter((id) => id !== colId);
      setAllowedColumnIds(next.length === allColumns.length ? null : next);
    } else {
      const next = [...allowedColumnIds, colId];
      setAllowedColumnIds(next.length === allColumns.length ? null : next);
    }
  };

  const isColumnAllowed = (colId: string) => {
    return allowedColumnIds === null || allowedColumnIds.includes(colId);
  };

  const handleSave = () => {
    if (!selectedAssignmentId) return;
    updatePermissions.mutate({
      assignmentId: selectedAssignmentId,
      permissions: {
        allowedColumnIds,
        rowFilter: rowFilter.conditions.length > 0 ? rowFilter : null,
        manualRowOverrides:
          manualOverrides.include.length > 0 || manualOverrides.exclude.length > 0
            ? manualOverrides
            : null,
      },
    });
  };

  return (
    <div className="space-y-6 pt-4">
      {/* User selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select User</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users assigned. Add users in the Assignments tab first.</p>
          ) : (
            <Select
              value={selectedAssignmentId ?? ''}
              onValueChange={(v) => setSelectedAssignmentId(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user to configure permissions" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.userName} ({a.userEmail}) - {a.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedAssignmentId && (
        <>
          {permLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Column Access */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Column Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {allowedColumnIds === null
                      ? 'All columns are accessible. Toggle to restrict.'
                      : `${allowedColumnIds.length} of ${allColumns.length} columns accessible.`}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {allColumns.map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={isColumnAllowed(col.id)}
                          onChange={() => toggleColumn(col.id)}
                          className="rounded border-border"
                        />
                        <span className="text-sm truncate">{col.label}</span>
                        <span className="text-xs text-muted-foreground">({col.columnRole})</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Row Filter */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Row Filter</CardTitle>
                </CardHeader>
                <CardContent>
                  <RowFilterBuilder
                    filter={rowFilter}
                    columns={allColumns}
                    onChange={setRowFilter}
                  />
                </CardContent>
              </Card>

              {/* Manual Overrides */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Manual Row Overrides</CardTitle>
                </CardHeader>
                <CardContent>
                  <ManualRowPicker
                    overrides={manualOverrides}
                    onChange={setManualOverrides}
                  />
                </CardContent>
              </Card>

              {/* Save */}
              <div className="flex justify-end">
                <Button onClick={handleSave} isLoading={updatePermissions.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Permissions
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
