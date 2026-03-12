import type { BigQueryColumnInfo, SchemaDriftReport } from '@mapforge/shared';

export function detectSchemaDrift(
  exerciseId: string, previousSchema: BigQueryColumnInfo[], currentSchema: BigQueryColumnInfo[]
): SchemaDriftReport {
  const prevByName = new Map(previousSchema.map(c => [c.name, c]));
  const currByName = new Map(currentSchema.map(c => [c.name, c]));

  const addedColumns: string[] = [];
  const removedColumns: string[] = [];
  const typeChanges: SchemaDriftReport['typeChanges'] = [];

  for (const [name, col] of currByName) {
    if (!prevByName.has(name)) {
      addedColumns.push(name);
    } else {
      const prev = prevByName.get(name)!;
      if (prev.type !== col.type) {
        typeChanges.push({ column: name, oldType: prev.type, newType: col.type });
      }
    }
  }

  for (const name of prevByName.keys()) {
    if (!currByName.has(name)) removedColumns.push(name);
  }

  const hasDrift = addedColumns.length > 0 || removedColumns.length > 0 || typeChanges.length > 0;
  return { exerciseId, addedColumns, removedColumns, typeChanges, hasDrift };
}
