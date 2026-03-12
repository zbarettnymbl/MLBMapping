// client/src/hooks/useDependentOptions.ts
import { useQuery } from '@tanstack/react-query';
import { fetchReferenceTableValues } from '../api/reference-tables';
import type { ExerciseColumn } from '@mapforge/shared/types';

export function useDependentOptions(
  column: ExerciseColumn,
  parentValue: string | null
) {
  const hasDependency = !!column.dependentConfig;
  const enabled = hasDependency && parentValue !== null;

  return useQuery({
    queryKey: [
      'dependent-options',
      column.dependentConfig?.referenceTableId,
      column.dependentConfig?.parentReferenceColumn,
      parentValue,
      column.dependentConfig?.childReferenceColumn,
    ],
    queryFn: () =>
      fetchReferenceTableValues(
        column.dependentConfig!.referenceTableId,
        {
          filterColumn: column.dependentConfig!.parentReferenceColumn,
          filterValue: parentValue!,
          valueColumn: column.dependentConfig!.childReferenceColumn,
        }
      ),
    enabled,
    staleTime: 5 * 60_000, // 5 min cache -- reference data changes infrequently
  });
}
