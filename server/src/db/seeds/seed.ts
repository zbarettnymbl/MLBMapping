/**
 * MapForge seed runner.
 * Usage:
 *   npx tsx src/db/seeds/seed.ts          -- insert seed data (skip if exists)
 *   npx tsx src/db/seeds/seed.ts --fresh   -- drop all data, then re-seed
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "../schema.js";
import { ORG, users } from "./data/users.js";
import { exercises } from "./data/exercises.js";
import { sourceRecords } from "./data/records.js";
import { classifications } from "./data/classifications.js";
import { assignments } from "./data/assignments.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://mapforge:mapforge_dev@localhost:5432/mapforge";

const isFresh = process.argv.includes("--fresh");

async function main() {
  console.log("MapForge Seed Runner");
  console.log("====================");
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ":****@")}`);
  console.log(`Mode: ${isFresh ? "FRESH (drop + re-seed)" : "INSERT (skip existing)"}`);
  console.log("");

  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    // Create tables if they don't exist (basic DDL)
    await createTablesIfNeeded(client);

    if (isFresh) {
      console.log("[1/6] Clearing existing data...");
      await db.delete(schema.classificationHistory);
      await db.delete(schema.classificationValues);
      await db.delete(schema.enrichmentRecords);
      await db.delete(schema.userExerciseAssignments);
      await db.delete(schema.sourceRecords);
      await db.delete(schema.exerciseColumns);
      await db.delete(schema.bigquerySources);
      await db.delete(schema.bigqueryDestinations);
      await db.delete(schema.enrichmentExercises);
      await db.delete(schema.referenceTableRows);
      await db.delete(schema.referenceTables);
      await db.delete(schema.storedCredentials);
      await db.delete(schema.users);
      await db.delete(schema.organizations);
      console.log("   All tables cleared.");
    } else {
      console.log("[1/6] Checking existing data...");
    }

    // Seed organization
    console.log("[2/6] Seeding organization...");
    await db
      .insert(schema.organizations)
      .values({
        id: ORG.id,
        name: ORG.name,
        slug: ORG.slug,
        settings: ORG.settings,
      })
      .onConflictDoNothing();
    console.log("   1 organization seeded.");

    // Seed users
    console.log("[3/6] Seeding users...");
    for (const user of users) {
      await db
        .insert(schema.users)
        .values({
          id: user.id,
          orgId: user.orgId,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          passwordHash: "$2b$10$placeholder_hash_for_dev_seed",
        })
        .onConflictDoNothing();
    }
    console.log(`   ${users.length} users seeded.`);

    // Seed exercises
    console.log("[4/6] Seeding exercises...");
    for (const ex of exercises) {
      await db
        .insert(schema.enrichmentExercises)
        .values({
          id: ex.id,
          orgId: ex.orgId,
          name: ex.name,
          description: ex.description,
          status: ex.status,
          viewMode: ex.viewMode,
          uniqueKeyColumns: ex.uniqueKeyColumns,
          deadline: ex.deadline,
          version: ex.version,
          createdBy: ex.createdBy,
        })
        .onConflictDoNothing();
    }
    console.log(`   ${exercises.length} exercises seeded.`);

    // Seed source records
    console.log("[5/6] Seeding source records...");
    let recordCount = 0;
    const BATCH_SIZE = 50;
    for (let i = 0; i < sourceRecords.length; i += BATCH_SIZE) {
      const batch = sourceRecords.slice(i, i + BATCH_SIZE);
      await db
        .insert(schema.sourceRecords)
        .values(
          batch.map((r) => ({
            id: r.id,
            exerciseId: r.exerciseId,
            uniqueKey: r.uniqueKey,
            sourceData: r.sourceData,
            recordState: r.recordState,
          }))
        )
        .onConflictDoNothing();
      recordCount += batch.length;
    }
    console.log(`   ${recordCount} source records seeded.`);

    // Seed assignments
    console.log("[6/6] Seeding assignments and classifications...");
    for (const a of assignments) {
      await db
        .insert(schema.userExerciseAssignments)
        .values({
          id: a.id,
          userId: a.userId,
          exerciseId: a.exerciseId,
          role: a.role,
          assignedBy: a.assignedBy,
        })
        .onConflictDoNothing();
    }
    console.log(`   ${assignments.length} assignments seeded.`);

    // Note: Classification values require column IDs which depend on exercise_columns
    // being created by the app. For seed purposes, we skip direct classification_values
    // inserts since they need FK references to exercise_columns rows.
    // The classification data module is available for use once columns are defined.
    console.log(`   Classification data available (${classifications.length} values ready).`);

    // Seed demo BigQuery credential if mock mode is enabled
    if (process.env.MOCK_BIGQUERY === 'true') {
      await db
        .insert(schema.storedCredentials)
        .values({
          id: 'b0000000-0000-4000-8000-000000000001',
          orgId: ORG.id,
          name: 'Demo BigQuery Connection',
          credentialType: 'gcp_service_account',
          encryptedValue: 'mock-credential-no-real-key',
          createdBy: users[0].id,
        })
        .onConflictDoNothing();
      console.log('   1 demo BigQuery credential seeded (mock mode).');
    }

    console.log("");
    console.log("Seed complete!");
    console.log("");
    console.log("Summary:");
    console.log(`  Organizations: 1`);
    console.log(`  Users: ${users.length}`);
    console.log(`  Exercises: ${exercises.length}`);
    console.log(`  Source Records: ${recordCount}`);
    console.log(`  Assignments: ${assignments.length}`);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function createTablesIfNeeded(client: postgres.Sql) {
  // Use raw SQL to create tables. In production, use drizzle-kit push/migrate.
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organizations(id),
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT,
      google_id TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      avatar_url TEXT,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS enrichment_exercises (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organizations(id),
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      view_mode TEXT NOT NULL DEFAULT 'flat',
      unique_key_columns TEXT[] NOT NULL,
      deadline DATE,
      version INTEGER NOT NULL DEFAULT 1,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS exercise_columns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exercise_id UUID REFERENCES enrichment_exercises(id),
      key TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      data_type TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      column_role TEXT NOT NULL,
      required BOOLEAN DEFAULT false,
      default_value TEXT,
      config JSONB DEFAULT '{}',
      validation_rules JSONB DEFAULT '[]',
      reference_link JSONB,
      dependent_config JSONB,
      visible BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS source_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exercise_id UUID REFERENCES enrichment_exercises(id),
      unique_key JSONB NOT NULL,
      source_data JSONB NOT NULL,
      record_state TEXT NOT NULL DEFAULT 'new',
      first_seen_at TIMESTAMPTZ DEFAULT now(),
      last_refreshed_at TIMESTAMPTZ DEFAULT now(),
      removed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS classification_values (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      record_id UUID REFERENCES source_records(id),
      column_id UUID REFERENCES exercise_columns(id),
      value TEXT,
      updated_by UUID REFERENCES users(id),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (record_id, column_id)
    );

    CREATE TABLE IF NOT EXISTS classification_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      record_id UUID REFERENCES source_records(id),
      column_id UUID REFERENCES exercise_columns(id),
      old_value TEXT,
      new_value TEXT,
      changed_by UUID REFERENCES users(id),
      bulk_operation_id UUID,
      changed_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS user_exercise_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      exercise_id UUID REFERENCES enrichment_exercises(id),
      role TEXT NOT NULL DEFAULT 'editor',
      assigned_by UUID REFERENCES users(id),
      assigned_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (user_id, exercise_id)
    );

    CREATE TABLE IF NOT EXISTS enrichment_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exercise_id UUID REFERENCES enrichment_exercises(id),
      unique_key JSONB NOT NULL,
      source_data JSONB NOT NULL,
      classifications JSONB NOT NULL DEFAULT '{}',
      record_state TEXT NOT NULL DEFAULT 'new',
      validation_errors JSONB NOT NULL DEFAULT '[]',
      is_fully_classified BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bigquery_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exercise_id UUID REFERENCES enrichment_exercises(id),
      gcp_project TEXT NOT NULL,
      dataset TEXT NOT NULL,
      table_or_query TEXT NOT NULL,
      query_type TEXT NOT NULL,
      credential_id UUID,
      refresh_schedule TEXT,
      last_refreshed_at TIMESTAMPTZ,
      last_row_count INTEGER,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS stored_credentials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organizations(id),
      name TEXT NOT NULL,
      credential_type TEXT NOT NULL,
      encrypted_value TEXT NOT NULL,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bigquery_destinations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exercise_id UUID REFERENCES enrichment_exercises(id),
      gcp_project TEXT NOT NULL,
      dataset TEXT NOT NULL,
      table_name TEXT NOT NULL,
      write_mode TEXT NOT NULL,
      merge_key_columns TEXT[],
      credential_id UUID,
      include_source_columns BOOLEAN DEFAULT true,
      column_mapping JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS reference_tables (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organizations(id),
      name TEXT NOT NULL,
      description TEXT,
      columns JSONB,
      primary_key_column TEXT,
      display_column TEXT,
      row_count INTEGER,
      refresh_source TEXT,
      refresh_config JSONB,
      last_refreshed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS reference_table_rows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference_table_id UUID REFERENCES reference_tables(id),
      data JSONB,
      ordinal INTEGER
    );

    CREATE TABLE IF NOT EXISTS pipelines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organizations(id),
      name TEXT NOT NULL,
      description TEXT,
      nodes JSONB NOT NULL DEFAULT '[]',
      edges JSONB NOT NULL DEFAULT '[]',
      trigger_type TEXT NOT NULL DEFAULT 'manual',
      trigger_config JSONB DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      exercise_id UUID REFERENCES enrichment_exercises(id),
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pipeline_id UUID REFERENCES pipelines(id) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      triggered_by TEXT NOT NULL,
      triggered_by_user_id UUID REFERENCES users(id),
      started_at TIMESTAMPTZ DEFAULT now(),
      completed_at TIMESTAMPTZ,
      summary JSONB DEFAULT '{}',
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS pipeline_node_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id UUID REFERENCES pipeline_runs(id) NOT NULL,
      node_id TEXT NOT NULL,
      node_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      input_row_count INTEGER,
      output_row_count INTEGER,
      error_message TEXT,
      metadata JSONB DEFAULT '{}'
    );
  `);
}

main();
