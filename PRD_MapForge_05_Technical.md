# MapForge PRD -- Part 5: Technical Architecture & Infrastructure

---

## Architecture Overview

MapForge inherits DataForge's full-stack architecture and adapts it for the enrichment use case. The system is a monorepo with a React frontend, Node.js backend, PostgreSQL database, and BigQuery integration layer.

```
+----------------------------------+
|          Browser (Client)        |
|  React 19 + AG Grid + Zustand   |
|  + React Query + Tailwind CSS   |
+----------------+-----------------+
                 |
                 | HTTPS / WebSocket
                 |
+----------------v-----------------+
|          API Server              |
|  Node.js + Express 5 + TypeScript|
|  + Drizzle ORM + Redis          |
+-------+--------+--------+-------+
        |        |        |
   +----v--+ +---v---+ +--v-------+
   |Postgres| | Redis | | BigQuery |
   |  (RDS/ | |(cache)| | (GCP)    |
   | CloudSQL|        | |          |
   +--------+ +-------+ +----------+
```

---

## Technology Stack

### Carried Forward from DataForge

| Layer | Technology | DataForge Reference |
|---|---|---|
| Frontend framework | React 19 + TypeScript 5.9 | `client/` directory |
| Build tool | Vite 7 | `client/vite.config.ts` |
| CSS framework | Tailwind CSS 4 | `client/src/index.css` (design system) |
| Spreadsheet grid | AG Grid Community Edition | `client/src/components/grid/SpreadsheetGrid.tsx` |
| State management (app) | Zustand | `client/src/stores/` |
| State management (server) | React Query | `client/src/hooks/` |
| Backend framework | Node.js + Express 5 + TypeScript | `server/` directory |
| ORM | Drizzle ORM | `server/src/db/` |
| Database | PostgreSQL 16 | `server/src/db/schema.ts` |
| Caching | Redis | Sidecar container in ECS |
| Icons | lucide-react | Used throughout client |
| Pipeline visualization | React Flow | `client/src/components/pipeline/PipelineCanvas.tsx` |

### New / Changed for MapForge

| Layer | Technology | Reason |
|---|---|---|
| BigQuery client | `@google-cloud/bigquery` (Node.js) | Core data source/destination |
| Cloud platform | GCP (Cloud Run + Cloud SQL + Memorystore) | Client is a Google shop; all data in GCP |
| Authentication | Google OAuth 2.0 / Google Workspace SSO | Client uses Google Workspace; SSO preferred |
| Email | SendGrid or GCP-native (Mailgun / direct SMTP) | Notification emails to business users |
| Real-time sync | BigQuery Storage Write API or Datastream | Streaming classification changes to BigQuery |

---

## GCP Architecture (Target Deployment)

The client's infrastructure is Google Cloud. The DataForge AWS architecture maps to GCP as follows:

```
DataForge (AWS)                    MapForge (GCP)
─────────────────                  ──────────────────
ECS Fargate (containers)    ->     Cloud Run (containers)
RDS PostgreSQL              ->     Cloud SQL for PostgreSQL
ECR (container registry)    ->     Artifact Registry
ALB (load balancer)         ->     Cloud Run built-in LB (or Cloud Load Balancing)
Secrets Manager             ->     Secret Manager
S3 (file storage)           ->     Cloud Storage
ElastiCache Redis           ->     Memorystore for Redis
Route 53 (DNS)              ->     Cloud DNS
CloudWatch (logs)           ->     Cloud Logging
```

### GCP Architecture Diagram

```
                    +-------------------+
                    |   Cloud DNS       |
                    |  mapforge.mlb.com |
                    +--------+----------+
                             |
                    +--------v----------+
                    | Cloud Load        |
                    | Balancing (HTTPS) |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
    +---------v----------+       +----------v---------+
    | Cloud Run          |       | Cloud Run           |
    | (API + Client)     |       | (Worker)            |
    | - Express server   |       | - Pipeline executor |
    | - Serves React SPA |       | - BigQuery sync     |
    | - API endpoints    |       | - Scheduled jobs    |
    +----+------+--------+       +----+------+---------+
         |      |                     |      |
    +----v--+ +-v-------+       +-----v--+ +-v--------+
    |Cloud  | |Memory-  |       |Cloud   | |BigQuery  |
    |SQL    | |store    |       |Storage | |(source + |
    |(Postgres)|(Redis) |       |(files) | | dest)    |
    +-------+ +---------+       +--------+ +----------+
```

### Cost Estimate (GCP)

| Resource | Spec | Estimated Monthly Cost |
|---|---|---|
| Cloud Run (API) | 1 vCPU, 512MB, always-on | ~$15-25 |
| Cloud Run (Worker) | 1 vCPU, 1GB, scales to 0 | ~$5-15 |
| Cloud SQL (PostgreSQL) | db-f1-micro (dev) / db-g1-small (prod) | ~$10-30 |
| Memorystore (Redis) | Basic tier, 1GB | ~$35 |
| Cloud Storage | < 10GB | ~$1 |
| BigQuery | Depends on query volume | Variable (likely $5-20) |
| Secret Manager | < 10 secrets | ~$0.50 |
| **Total (Dev)** | | **~$50-75/month** |
| **Total (Prod)** | | **~$75-130/month** |

Comparable to DataForge's $40-50/month AWS cost, with the Redis instance being the largest fixed cost.

---

## Database Schema (Key Tables)

### Carried from DataForge (with adaptations)

```sql
-- Organizations (REUSE)
-- Already exists in DataForge; represents the client's team
organizations (id, name, slug, settings, created_at, updated_at)

-- Users (ADAPT from DataForge auth)
users (id, org_id, email, name, password_hash, google_id, role: 'admin'|'user',
       avatar_url, last_login_at, created_at, updated_at)

-- Reference Tables (REUSE)
reference_tables (id, org_id, name, description, columns: jsonb,
                  primary_key_column, display_column, row_count,
                  refresh_source: 'manual'|'url'|'sftp'|'bigquery',
                  refresh_config: jsonb, last_refreshed_at,
                  created_at, updated_at)

reference_table_rows (id, reference_table_id, data: jsonb, ordinal)
```

### New Tables for MapForge

```sql
-- Enrichment Exercises (evolved from DataForge templates)
enrichment_exercises (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',  -- draft, active, paused, archived
  view_mode text NOT NULL DEFAULT 'flat', -- flat, matrix
  unique_key_columns text[] NOT NULL,     -- e.g., ['siteId', 'programId']
  deadline date,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exercise Columns (evolved from DataForge template_columns)
exercise_columns (
  id uuid PRIMARY KEY,
  exercise_id uuid REFERENCES enrichment_exercises,
  key text NOT NULL,
  label text NOT NULL,
  description text,
  data_type text NOT NULL,     -- text, number, date, boolean, picklist, multi_select
  ordinal integer NOT NULL,
  column_role text NOT NULL,   -- 'source' (read-only) | 'classification' (editable) | 'computed'
  required boolean DEFAULT false,
  default_value text,
  config jsonb DEFAULT '{}',   -- picklist values, dependent config, number range, etc.
  validation_rules jsonb DEFAULT '[]',
  reference_link jsonb,        -- { referenceTableId, referenceColumnKey, displayColumnKey }
  dependent_config jsonb,      -- { parentColumnKey, referenceTableId, parentRefColumn, childRefColumn }
  visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- BigQuery Source Configurations
bigquery_sources (
  id uuid PRIMARY KEY,
  exercise_id uuid REFERENCES enrichment_exercises,
  gcp_project text NOT NULL,
  dataset text NOT NULL,
  table_or_query text NOT NULL, -- table name or SQL query
  query_type text NOT NULL,     -- 'table' | 'query'
  credential_id uuid REFERENCES stored_credentials,
  refresh_schedule text,        -- cron expression or null for manual
  last_refreshed_at timestamptz,
  last_row_count integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stored Credentials (for BigQuery service accounts)
stored_credentials (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations,
  name text NOT NULL,
  credential_type text NOT NULL,  -- 'gcp_service_account'
  encrypted_value bytea NOT NULL, -- encrypted JSON key
  created_by uuid REFERENCES users,
  created_at timestamptz DEFAULT now()
);

-- Source Records (cached from BigQuery)
source_records (
  id uuid PRIMARY KEY,
  exercise_id uuid REFERENCES enrichment_exercises,
  unique_key jsonb NOT NULL,      -- e.g., {"siteId": "22044", "programId": "3998508"}
  source_data jsonb NOT NULL,     -- full row from BigQuery
  record_state text NOT NULL DEFAULT 'new',  -- new, existing, changed, removed, archived
  first_seen_at timestamptz DEFAULT now(),
  last_refreshed_at timestamptz DEFAULT now(),
  removed_at timestamptz,
  UNIQUE (exercise_id, unique_key)
);

-- Classification Values (the core enrichment data)
classification_values (
  id uuid PRIMARY KEY,
  record_id uuid REFERENCES source_records,
  column_id uuid REFERENCES exercise_columns,
  value text,                     -- stored as text; parsed by data type
  updated_by uuid REFERENCES users,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (record_id, column_id)
);

-- Classification History (audit trail)
classification_history (
  id uuid PRIMARY KEY,
  record_id uuid REFERENCES source_records,
  column_id uuid REFERENCES exercise_columns,
  old_value text,
  new_value text,
  changed_by uuid REFERENCES users,
  bulk_operation_id uuid,          -- groups bulk edits
  changed_at timestamptz DEFAULT now()
);

-- User Exercise Assignments
user_exercise_assignments (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users,
  exercise_id uuid REFERENCES enrichment_exercises,
  role text NOT NULL DEFAULT 'editor',  -- editor, viewer
  assigned_by uuid REFERENCES users,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE (user_id, exercise_id)
);

-- BigQuery Export Configurations
bigquery_destinations (
  id uuid PRIMARY KEY,
  exercise_id uuid REFERENCES enrichment_exercises,
  gcp_project text NOT NULL,
  dataset text NOT NULL,
  table_name text NOT NULL,
  write_mode text NOT NULL,    -- 'merge' | 'append' | 'overwrite'
  merge_key_columns text[],    -- columns to match on for merge mode
  credential_id uuid REFERENCES stored_credentials,
  include_source_columns boolean DEFAULT true,
  column_mapping jsonb,        -- optional: rename columns for export
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## API Endpoints (Key Routes)

### Carried from DataForge

| Method | Path | DataForge Route | MapForge Usage |
|---|---|---|---|
| CRUD | `/api/reference-tables/*` | `referenceTables.ts` | Manage lookup tables |
| CRUD | `/api/pipelines/*` | `pipelines.ts` | Build automation pipelines |
| GET | `/api/audit-log` | `auditLog.ts` | View change history |
| CRUD | `/api/organizations/*` | `organizations.ts` | Org management |
| POST | `/api/auth/*` | `auth.ts` | Authentication |

### New Routes for MapForge

```
// Enrichment Exercises
GET    /api/exercises                      -- list all exercises (admin: all, user: assigned)
POST   /api/exercises                      -- create exercise
GET    /api/exercises/:id                  -- get exercise with columns and config
PUT    /api/exercises/:id                  -- update exercise
DELETE /api/exercises/:id                  -- delete exercise
POST   /api/exercises/:id/publish          -- publish draft exercise
POST   /api/exercises/:id/refresh          -- trigger manual data refresh from BigQuery

// Exercise Columns
GET    /api/exercises/:id/columns          -- list columns
POST   /api/exercises/:id/columns          -- add column
PUT    /api/exercises/:id/columns/:colId   -- update column
DELETE /api/exercises/:id/columns/:colId   -- delete column

// Source Records + Classifications
GET    /api/exercises/:id/records          -- get records with classifications (paginated, filterable)
PUT    /api/exercises/:id/records/:recordId/classify  -- set classification value(s)
POST   /api/exercises/:id/records/bulk-classify       -- bulk set classification values
GET    /api/exercises/:id/records/:recordId/history    -- get classification history for a record
GET    /api/exercises/:id/stats            -- completion stats (total, classified, errors)

// BigQuery Integration
POST   /api/bigquery/test-connection       -- test BigQuery credentials and query
POST   /api/bigquery/preview               -- run query and return preview rows
POST   /api/exercises/:id/export           -- manual export to BigQuery destination

// User Assignments
GET    /api/exercises/:id/assignments      -- list assigned users
POST   /api/exercises/:id/assignments      -- assign user
DELETE /api/exercises/:id/assignments/:userId -- remove assignment
GET    /api/exercises/:id/progress         -- per-user progress stats

// Credentials
POST   /api/credentials                    -- store encrypted credential
GET    /api/credentials                    -- list credentials (metadata only, no secrets)
DELETE /api/credentials/:id                -- delete credential
```

---

## Security Considerations

| Concern | Approach | DataForge Reference |
|---|---|---|
| BigQuery credentials | Encrypted at rest using AES-256; stored in `stored_credentials` table; never sent to client | Follows DataForge's API key storage pattern (`server/src/routes/apiKeys.ts`) |
| Authentication | Google OAuth 2.0 for SSO; fallback to email/password | Extends existing auth routes |
| Authorization | Role-based: admin (full access) vs. user (exercise-scoped) | New exercise-level assignment |
| Data in transit | HTTPS everywhere; Cloud SQL requires SSL | Same as DataForge's RDS SSL requirement |
| SQL injection | Drizzle ORM parameterized queries; never interpolate user input | Existing pattern |
| XSS | React's built-in escaping; no dangerouslySetInnerHTML | Existing pattern |
| Audit compliance | Every data change logged with user + timestamp | Enhanced from DataForge's audit log |

---

## Performance Considerations

| Scenario | Expected Volume | Approach |
|---|---|---|
| Large datasets (5K+ records) | Up to 10K records per exercise | AG Grid virtual scrolling; paginated API; Redis cache for frequently accessed data |
| Many concurrent users | 5-20 simultaneous editors | Optimistic concurrency control; last-write-wins with conflict detection |
| BigQuery refresh | 100K+ row queries | Background job; stream results to PostgreSQL in batches; show "refreshing" indicator |
| Real-time classification save | 1 save per second per user | Debounced client-side (300ms); batch server-side writes; async BigQuery push |
| Dropdown search on large picklists | 500+ options | Client-side search/filter in AG Grid editor; lazy-load if > 1000 |

---

## Migration Path from DataForge

The recommended approach is to **fork DataForge** rather than modify it in place, since the two products serve different markets:

1. Fork the DataForge repository
2. Rename to MapForge throughout
3. Remove features not needed: file upload wizard, AI mapping engine, CSV agent, document extraction
4. Keep: templates (-> exercises), reference tables, pipelines, validation engine, audit log, AG Grid, design system, all common components
5. Add: BigQuery integration layer, enrichment mode UI, user assignment, dependent dropdowns
6. Retarget deployment from AWS to GCP

This preserves all 18 shared UI components, the design system, the pipeline builder, and the server architecture while allowing MapForge to evolve independently.

---

## Deliverables for Client

As discussed on the call, the following deliverables are expected:

1. **This PRD** -- shared with the client for alignment
2. **GCP Architecture Diagram** -- visual diagram of the Cloud Run + Cloud SQL + BigQuery architecture
3. **Cost Comparison** -- Dev vs. Prod tier pricing on GCP
4. **Technology Approval List** -- inventory of all technologies for InfoSec review
5. **Prototype/Demo** -- working demo using the Development Programming Classification use case (the Google Sheet Erin showed) as the first exercise
6. **Timeline Estimate** -- phased delivery plan with milestones

### Data Requested from Client

- Export of the Development Programming Google Sheet (to use as prototype data)
- BigQuery table/query that feeds the Development Programming sheet
- List of sport categories and categorizations (the reference data)
- Draft Ranking Weights Google Sheet (for Phase 3 matrix view planning)
- List of users who would need access (for access control design)
- GCP project details and any technology constraints from InfoSec
