/**
 * Drizzle ORM schema for MapForge.
 * Matches the database schema defined in PRD_MapForge_05_Technical.md
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================================
// Organizations
// ============================================================
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Users
// ============================================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  googleId: text("google_id"),
  role: text("role").notNull().default("user"), // admin | user
  avatarUrl: text("avatar_url"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Enrichment Exercises
// ============================================================
export const enrichmentExercises = pgTable("enrichment_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, active, paused, completed, archived
  viewMode: text("view_mode").notNull().default("flat"), // flat, matrix
  uniqueKeyColumns: text("unique_key_columns").array().notNull(),
  deadline: date("deadline"),
  version: integer("version").notNull().default(1),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Exercise Columns
// ============================================================
export const exerciseColumns = pgTable("exercise_columns", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseId: uuid("exercise_id").references(() => enrichmentExercises.id).notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  dataType: text("data_type").notNull(), // text, number, date, boolean, picklist, multi_select
  ordinal: integer("ordinal").notNull(),
  columnRole: text("column_role").notNull(), // source, classification, computed
  required: boolean("required").default(false),
  defaultValue: text("default_value"),
  config: jsonb("config").default({}),
  validationRules: jsonb("validation_rules").default([]),
  referenceLink: jsonb("reference_link"),
  dependentConfig: jsonb("dependent_config"),
  visible: boolean("visible").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Source Records
// ============================================================
export const sourceRecords = pgTable("source_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseId: uuid("exercise_id").references(() => enrichmentExercises.id),
  uniqueKey: jsonb("unique_key").notNull(),
  sourceData: jsonb("source_data").notNull(),
  recordState: text("record_state").notNull().default("new"), // new, existing, changed, removed, archived
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow(),
  lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }).defaultNow(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
});

// ============================================================
// Classification Values
// ============================================================
export const classificationValues = pgTable("classification_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordId: uuid("record_id").references(() => sourceRecords.id),
  columnId: uuid("column_id").references(() => exerciseColumns.id),
  value: text("value"),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Classification History
// ============================================================
export const classificationHistory = pgTable("classification_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordId: uuid("record_id").references(() => sourceRecords.id),
  columnId: uuid("column_id").references(() => exerciseColumns.id),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: uuid("changed_by").references(() => users.id),
  bulkOperationId: uuid("bulk_operation_id"),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// User Exercise Assignments
// ============================================================
export const userExerciseAssignments = pgTable("user_exercise_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  exerciseId: uuid("exercise_id").references(() => enrichmentExercises.id).notNull(),
  role: text("role").notNull().default("editor"), // editor, viewer
  assignedBy: uuid("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Enrichment Records (denormalized view used by business dashboard)
// Combines source record data with classification state for efficient querying
// ============================================================
export const enrichmentRecords = pgTable("enrichment_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseId: uuid("exercise_id").references(() => enrichmentExercises.id).notNull(),
  uniqueKey: jsonb("unique_key").notNull(),
  sourceData: jsonb("source_data").notNull(),
  classifications: jsonb("classifications").notNull().default({}),
  recordState: text("record_state").notNull().default("new"),
  validationErrors: jsonb("validation_errors").notNull().default([]),
  isFullyClassified: boolean("is_fully_classified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// BigQuery Sources
// ============================================================
export const bigquerySources = pgTable("bigquery_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseId: uuid("exercise_id").references(() => enrichmentExercises.id),
  gcpProject: text("gcp_project").notNull(),
  dataset: text("dataset").notNull(),
  tableOrQuery: text("table_or_query").notNull(),
  queryType: text("query_type").notNull(), // table | query
  credentialId: uuid("credential_id"),
  refreshSchedule: text("refresh_schedule"),
  lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
  lastRowCount: integer("last_row_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Stored Credentials
// ============================================================
export const storedCredentials = pgTable("stored_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  name: text("name").notNull(),
  credentialType: text("credential_type").notNull(), // gcp_service_account
  encryptedValue: text("encrypted_value").notNull(), // would be bytea in production
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// BigQuery Destinations
// ============================================================
export const bigqueryDestinations = pgTable("bigquery_destinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseId: uuid("exercise_id").references(() => enrichmentExercises.id),
  gcpProject: text("gcp_project").notNull(),
  dataset: text("dataset").notNull(),
  tableName: text("table_name").notNull(),
  writeMode: text("write_mode").notNull(), // merge | append | overwrite
  mergeKeyColumns: text("merge_key_columns").array(),
  credentialId: uuid("credential_id"),
  includeSourceColumns: boolean("include_source_columns").default(true),
  columnMapping: jsonb("column_mapping"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Reference Tables
// ============================================================
export const referenceTables = pgTable("reference_tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  columns: jsonb("columns"),
  primaryKeyColumn: text("primary_key_column"),
  displayColumn: text("display_column"),
  rowCount: integer("row_count"),
  refreshSource: text("refresh_source"), // manual, url, sftp, bigquery
  refreshConfig: jsonb("refresh_config"),
  lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const referenceTableRows = pgTable("reference_table_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceTableId: uuid("reference_table_id").references(() => referenceTables.id),
  data: jsonb("data"),
  ordinal: integer("ordinal"),
});

// ============================================================
// Reference Table Versions
// ============================================================
export const referenceTableVersions = pgTable("reference_table_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceTableId: uuid("reference_table_id").references(() => referenceTables.id).notNull(),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
});

// ============================================================
// Pipeline Definitions
// ============================================================
export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  nodes: jsonb("nodes").notNull().default([]),
  edges: jsonb("edges").notNull().default([]),
  triggerType: text("trigger_type").notNull().default("manual"),
  triggerConfig: jsonb("trigger_config").default({}),
  status: text("status").notNull().default("draft"),
  exerciseId: uuid("exercise_id").references(() => enrichmentExercises.id),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Pipeline Execution Runs
// ============================================================
export const pipelineRuns = pgTable("pipeline_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: uuid("pipeline_id").references(() => pipelines.id).notNull(),
  status: text("status").notNull().default("pending"),
  triggeredBy: text("triggered_by").notNull(),
  triggeredByUserId: uuid("triggered_by_user_id").references(() => users.id),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  summary: jsonb("summary").default({}),
  errorMessage: text("error_message"),
});

// ============================================================
// Per-Node Execution State
// ============================================================
export const pipelineNodeRuns = pgTable("pipeline_node_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => pipelineRuns.id).notNull(),
  nodeId: text("node_id").notNull(),
  nodeType: text("node_type").notNull(),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  inputRowCount: integer("input_row_count"),
  outputRowCount: integer("output_row_count"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}),
});
