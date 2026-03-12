# MapForge Phase 2-4 Feature Sequencing

## Overview

Five features remain unbuilt. This document maps their dependencies and recommended build order.

## Dependency Graph

```
BigQuery Integration (foundation)
  |
  +-- Source Data Sync (depends on BQ read)
  |     |
  |     +-- Exercise Creation Wizard (orchestrates BQ + Sync + RefTables + Columns)
  |
  +-- Enhanced Reference Tables (BQ refresh depends on BQ Integration)
  |     |
  |     +-- Exercise Creation Wizard (step 6 uses reference tables)
  |
  +-- Pipeline Engine (uses BQ read + write, Source Sync, Validation)
```

## Recommended Build Order

| Order | Feature | Depends On | Phase |
|-------|---------|-----------|-------|
| 1 | BigQuery Integration | Nothing | Phase 2 |
| 2 | Source Data Sync | BigQuery Integration | Phase 2 |
| 3 | Enhanced Reference Tables | BigQuery Integration (for BQ refresh) | Phase 2 |
| 4 | Exercise Creation Wizard | BQ Integration, Source Sync, Ref Tables | Phase 2 |
| 5 | Pipeline Engine | All of the above | Phase 3 |

## Parallelization

Features 2 and 3 (Source Data Sync and Enhanced Reference Tables) can be built in parallel once BigQuery Integration is complete. Both feed into the Exercise Creation Wizard.

## Current State Summary

**Already built:**
- Drizzle schema for all tables (exercises, columns, records, classifications, BQ sources/destinations, credentials, reference tables)
- Exercise list/detail/records/classify API routes (mock data in `:id` and `:id/records`)
- Admin dashboard routes (real DB queries for exercise list and progress)
- Full AG Grid spreadsheet UI (dependent dropdowns, bulk edit, validation, auto-save)
- Dashboard pages (admin + business user)
- Auth context, middleware, protected routes
- Shared types for exercises, records, classifications
- Seed data system

**What "mock" means:** The `GET /exercises/:id`, `GET /exercises/:id/records`, `PUT .../classify`, and `POST .../bulk-classify` routes return hardcoded mock data. The `GET /exercises` list route and admin routes use real Drizzle queries. Reference table routes are fully mocked.

## Plan Documents

1. `2026-03-11-bigquery-integration.md`
2. `2026-03-11-source-data-sync.md`
3. `2026-03-11-enhanced-reference-tables.md`
4. `2026-03-11-exercise-creation-wizard.md`
5. `2026-03-11-pipeline-engine.md`
