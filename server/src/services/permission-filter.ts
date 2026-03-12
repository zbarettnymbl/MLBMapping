import { sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { exerciseColumns, assignmentPermissions, userExerciseAssignments } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { RowFilter, RowFilterCondition, ManualRowOverrides } from '@mapforge/shared';

const VALID_OPERATORS = ['eq', 'neq', 'in', 'not_in', 'contains', 'starts_with', 'is_null', 'is_not_null'] as const;

/**
 * Fetch permissions for a user's assignment on an exercise.
 * Returns null if the user has no assignment.
 */
export async function getUserPermissions(userId: string, exerciseId: string) {
  const [assignment] = await db
    .select({
      assignmentId: userExerciseAssignments.id,
      role: userExerciseAssignments.role,
      allowedColumnIds: assignmentPermissions.allowedColumnIds,
      rowFilter: assignmentPermissions.rowFilter,
      manualRowOverrides: assignmentPermissions.manualRowOverrides,
    })
    .from(userExerciseAssignments)
    .leftJoin(assignmentPermissions, eq(assignmentPermissions.assignmentId, userExerciseAssignments.id))
    .where(
      and(
        eq(userExerciseAssignments.userId, userId),
        eq(userExerciseAssignments.exerciseId, exerciseId)
      )
    );

  return assignment || null;
}

/**
 * Validate that all column names in a row filter exist in the exercise's columns.
 * Returns an array of invalid column names, or empty array if all valid.
 */
export async function validateFilterColumns(exerciseId: string, filter: RowFilter): Promise<string[]> {
  const columns = await db
    .select({ key: exerciseColumns.key })
    .from(exerciseColumns)
    .where(eq(exerciseColumns.exerciseId, exerciseId));

  const validKeys = new Set(columns.map(c => c.key));
  const invalid: string[] = [];

  for (const condition of filter.conditions) {
    if (!validKeys.has(condition.column)) {
      invalid.push(condition.column);
    }
    if (!VALID_OPERATORS.includes(condition.operator as typeof VALID_OPERATORS[number])) {
      invalid.push(`invalid operator: ${condition.operator}`);
    }
  }

  return invalid;
}

/**
 * Build parameterized SQL WHERE clause fragments from a row filter.
 * All values are parameterized - column names are validated before reaching this function.
 */
export function buildRowFilterSql(filter: RowFilter, tableAlias: string = 'enrichment_records') {
  if (!filter.conditions.length) return null;

  const fragments = filter.conditions.map(condition => {
    return buildConditionSql(condition, tableAlias);
  }).filter(Boolean);

  if (fragments.length === 0) return null;

  const joiner = filter.logic === 'or' ? sql` OR ` : sql` AND `;
  let combined = fragments[0]!;
  for (let i = 1; i < fragments.length; i++) {
    combined = sql`${combined}${joiner}${fragments[i]}`;
  }

  return sql`(${combined})`;
}

function buildConditionSql(condition: RowFilterCondition, tableAlias: string) {
  // Column access via JSONB operator - always parameterized values
  const colAccess = sql`${sql.raw(tableAlias)}.source_data->>${sql.param(condition.column)}`;

  switch (condition.operator) {
    case 'eq':
      return sql`${colAccess} = ${condition.value}`;
    case 'neq':
      return sql`${colAccess} != ${condition.value}`;
    case 'in':
      if (!condition.values?.length) return null;
      return sql`${colAccess} = ANY(${condition.values})`;
    case 'not_in':
      if (!condition.values?.length) return null;
      return sql`${colAccess} != ALL(${condition.values})`;
    case 'contains':
      return sql`${colAccess} ILIKE ${'%' + (condition.value || '') + '%'}`;
    case 'starts_with':
      return sql`${colAccess} ILIKE ${(condition.value || '') + '%'}`;
    case 'is_null':
      return sql`${colAccess} IS NULL`;
    case 'is_not_null':
      return sql`${colAccess} IS NOT NULL`;
    default:
      return null;
  }
}

/**
 * Build SQL for manual row overrides (include/exclude by record ID).
 */
export function buildManualOverridesSql(overrides: ManualRowOverrides, idColumn: ReturnType<typeof sql.raw>) {
  const fragments = [];

  if (overrides.include.length > 0) {
    fragments.push(sql`${idColumn} = ANY(${overrides.include}::uuid[])`);
  }

  if (overrides.exclude.length > 0) {
    fragments.push(sql`${idColumn} != ALL(${overrides.exclude}::uuid[])`);
  }

  return fragments;
}

/**
 * Strip disallowed columns from a record's sourceData and classifications.
 */
export function stripDisallowedColumns(
  record: { sourceData: Record<string, unknown>; classifications: Record<string, string | null> },
  allowedColumnKeys: Set<string>,
  allColumnKeys: Set<string>
) {
  const strippedSourceData: Record<string, unknown> = {};
  const strippedClassifications: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(record.sourceData)) {
    if (allowedColumnKeys.has(key) || !allColumnKeys.has(key)) {
      strippedSourceData[key] = value;
    }
  }

  for (const [key, value] of Object.entries(record.classifications)) {
    if (allowedColumnKeys.has(key)) {
      strippedClassifications[key] = value;
    }
  }

  return { sourceData: strippedSourceData, classifications: strippedClassifications };
}
