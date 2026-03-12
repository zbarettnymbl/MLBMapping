# MapForge PRD -- Part 4: Feature Specifications

---

## Feature Matrix: Complexity Assessment

This section provides detailed specifications for each MapForge feature, identifying complexity and implementation approach. Each feature is broken down into sub-features with an estimated complexity level.

### Legend

- **LOW** -- Standard implementation using well-established patterns
- **MEDIUM** -- Requires meaningful custom development
- **HIGH** -- No existing pattern; must be built from scratch

---

## F1: Enrichment Exercise Manager

| Sub-Feature | Complexity | Notes |
|---|---|---|
| Exercise CRUD (create, read, update, delete) | MEDIUM | Core model with source config attached |
| Exercise lifecycle (draft, active, paused, archived) | LOW | Standard status field with four states |
| Exercise versioning | LOW | Snapshot on publish |
| Exercise duplication | MEDIUM | Clone an exercise with its full config |

### Data Model

```
EnrichmentExercise {
  id
  name
  description
  version
  status: draft | active | paused | archived
  sourceColumns: ExerciseColumn[]         // read-only
  classificationColumns: ExerciseColumn[] // editable
  createdAt
  updatedAt
  sourceConfig: BigQuerySourceConfig | FileSourceConfig
  uniqueKeyColumns: string[]
  refreshSchedule: CronConfig | null
  assignedUsers: UserAssignment[]
  deadline: Date | null
  viewMode: 'flat' | 'matrix'
}
```

---

## F2: BigQuery Integration Layer

| Sub-Feature | Complexity | Notes |
|---|---|---|
| BigQuery connection configuration | HIGH | GCP auth, project/dataset/table selection |
| BigQuery query execution | HIGH | Run SQL, return results |
| BigQuery schema detection | HIGH | Auto-detect columns and types from query results |
| BigQuery write (batch) | HIGH | Merge/append/overwrite modes |
| BigQuery write (streaming) | HIGH | Real-time push via BigQuery streaming insert API |
| BigQuery connection testing | HIGH | Validate credentials and query before saving |
| Connection credential storage | MEDIUM | Store GCP credentials securely using encrypted vault pattern |

### Technical Considerations

- Use the `@google-cloud/bigquery` Node.js client library
- Service Account JSON key stored encrypted in the database
- Query results cached in PostgreSQL (the MapForge database) to avoid repeated BigQuery hits
- BigQuery streaming inserts for real-time mode; batch loads for scheduled mode
- Cost awareness: BigQuery charges per byte scanned -- cache aggressively

---

## F3: Source Data Sync Engine

| Sub-Feature | Complexity | Notes |
|---|---|---|
| Initial data pull | MEDIUM | First pull when exercise is published |
| Incremental refresh | HIGH | Detect new/changed/removed records by unique key |
| Record state tracking (new, existing, changed, removed) | HIGH | State machine per record |
| Source data caching in PostgreSQL | MEDIUM | Store source snapshots locally |
| Unique key matching | HIGH | Join source data to existing classifications by composite key |
| Schema drift detection | HIGH | Alert when BigQuery schema changes |

### Record State Machine

```
                    +-> [EXISTING] -- source data unchanged, classification intact
                    |
[NEW] -- first pull +-> [CHANGED]  -- source data updated, classification preserved, flagged for review
                    |
                    +-> [REMOVED]  -- record no longer in source, moved to historical

[EXISTING] --------+-> [CHANGED]  -- on next refresh if source data differs
                    |
                    +-> [REMOVED]  -- on next refresh if key not found in source

[CHANGED] ---------+-> [EXISTING] -- user reviews and confirms
                    |
                    +-> [REMOVED]  -- on next refresh if key not found

[REMOVED] ---------+-> [ARCHIVED] -- admin explicitly archives
```

---

## F4: Classification Data Store

| Sub-Feature | Complexity | Notes |
|---|---|---|
| Per-cell value storage | MEDIUM | Store classification values keyed by record ID + column |
| Auto-save on edit | MEDIUM | Debounced save, optimistic UI |
| Conflict resolution | HIGH | If two users edit the same record simultaneously |
| Classification history per cell | HIGH | Linked to audit log |
| Computed/rollup column evaluation | MEDIUM | Evaluate on every dependent cell change |
| Default value population | LOW | Applied to new records automatically |

### Database Schema (Conceptual)

```sql
-- Core tables
enrichment_exercises       -- exercise definitions and configuration
exercise_columns           -- column definitions per exercise
exercise_source_configs    -- BigQuery/file connection details

-- Reference data
reference_tables           -- lookup tables for picklists and validation
reference_table_rows       -- individual rows within reference tables

-- Classification data
source_records             -- cached source data rows, keyed by unique composite key
classification_values      -- per-cell values: (record_id, column_id, value, updated_by, updated_at)
classification_history     -- audit trail: (record_id, column_id, old_value, new_value, user_id, timestamp)

-- Record lifecycle
record_states              -- (record_id, state: new|existing|changed|removed|archived, since)

-- User management
users                      -- authentication and profile data
user_exercise_assignments  -- which users can access which exercises
```

---

## F5: Spreadsheet UI (Enrichment Mode)

| Sub-Feature | Complexity | Notes |
|---|---|---|
| AG Grid spreadsheet with virtual scrolling | LOW | Handles 10K+ rows out of the box |
| Read-only source columns (left side) | MEDIUM | Visual distinction: gray background, lock icon |
| Editable classification columns (right side) | MEDIUM | Dropdown, text, number, date editors |
| Inline dropdown editor with search/filter | MEDIUM | Add search within dropdown for long picklist |
| Dependent dropdown filtering | HIGH | When parent value changes, child dropdown options update |
| Cell-level validation highlighting | LOW | Red border + hover tooltip |
| Row status indicator | LOW | Classified/Unclassified/Error states |
| Column header with type indicator | LOW | Show data type icon, required badge |
| Quick filter bar (All/Unclassified/Classified/Errors) | MEDIUM | Filter preset buttons above the grid |
| Multi-row selection + bulk edit | MEDIUM | "Apply to Selected" action panel |
| Progress bar header | LOW | Show X of Y classified |
| Keyboard navigation (Tab to next editable cell) | MEDIUM | Skip read-only cells on Tab |
| "New record" highlight | HIGH | Visual indicator for records added in latest refresh |
| "Source changed" indicator | HIGH | Flag records where source data changed since last classification |

### Visual Design

Following the "Industrial Precision" design system:

- **Source columns**: `bg-forge-900` background, `text-forge-400` text, subtle lock icon in header
- **Classification columns**: `bg-forge-950` background (darker = editable), `text-forge-50` text, amber header accent
- **Unclassified row**: Left border `border-l-2 border-amber-500/40`
- **Classified row**: Left border `border-l-2 border-status-clean`
- **Error row**: Left border `border-l-2 border-status-error`
- **New record**: `bg-cyan-950/20` row background with "NEW" badge
- **Dropdown editor**: `bg-forge-800` with `ring-amber-500/40` focus ring

---

## F6: Validation Engine

| Sub-Feature | Complexity | Notes |
|---|---|---|
| Required field validation | LOW | Auto-generated for required classification columns |
| Picklist membership validation | LOW | Ensure value is in the allowed list |
| Number range validation | LOW | Min/max for numeric columns |
| Date range validation | LOW | Min/max dates |
| Regex pattern validation | LOW | For text columns |
| Dependent dropdown validation | HIGH | "If column A = X, column B must be in [Y1, Y2, Y3]" |
| Cross-column relational rules | MEDIUM | Complex multi-column constraints |
| Conditional required rules | MEDIUM | "If A is filled, B is required" |
| Custom JavaScript validation hooks | MEDIUM | For complex business logic |
| Client-side validation (instant) | MEDIUM | Run picklist/required checks in-browser |
| Server-side validation (on save) | LOW | Full validation on every save |
| Validation summary statistics | MEDIUM | Count errors/warnings/complete per exercise |
| Validation webhook (external service) | MEDIUM | Call external API to validate values |

### Dependent Dropdown Implementation

This is the most important new validation feature. Implementation approach:

```typescript
// Configuration for dependent picklists
interface DependentPicklistConfig {
  parentColumnKey: string;           // e.g., "sportCategory"
  valueMap: Record<string, string[]>; // e.g., { "Boys Baseball": ["MLB ID Tour", ...] }
  // OR
  referenceTableId: string;          // Reference table with parent-child hierarchy
  parentReferenceColumn: string;     // Column in ref table that matches parent value
  childReferenceColumn: string;      // Column in ref table to pull child values from
}
```

The column-to-reference-table link provides the foundation for this feature. The relational rule expression engine can enforce the constraint. The UI would extend the AG Grid cell editor to dynamically filter options based on the parent column's current value.

---

## F7: Reference Tables (Enhanced)

| Sub-Feature | Complexity | Notes |
|---|---|---|
| CRUD for reference tables | LOW | Full REST API for managing reference tables |
| CSV import for reference data | LOW | Bulk import from CSV files |
| Manual row editing | LOW | Add/edit/delete rows |
| BigQuery as refresh source | HIGH | Pull reference data from BigQuery on schedule |
| Hierarchical column relationships | HIGH | Parent-child within a reference table |
| Link reference table to classification column | LOW | Associate a reference table with a dropdown column |
| Reference table versioning | HIGH | Track changes to reference data over time |
| Cross-exercise reference table sharing | LOW | Organization-scoped reference tables shared across exercises |

---

## F8: Pipeline Engine (Enhanced)

| Sub-Feature | Complexity | Notes |
|---|---|---|
| Visual DAG builder | LOW | Drag-and-drop pipeline builder using React Flow |
| BigQuery Source node | HIGH | New node type for BigQuery data ingestion |
| Enrichment Exercise node | HIGH | References an exercise; waits for completion or passes through current state |
| Validation Gate node | LOW | Pass/fail based on validation results |
| Transform node (unpivot, pivot, aggregate, filter) | MEDIUM | Standard transforms plus new unpivot capability |
| BigQuery Destination node | HIGH | New export target type for BigQuery |
| Notification node | LOW | Email + in-app notifications |
| Join node | LOW | Join datasets in the pipeline |
| Cron trigger | LOW | Schedule-based execution |
| Manual trigger | LOW | On-demand execution |
| API trigger | LOW | Webhook-based execution |
| Execution logging | LOW | Per-node status tracking |
| Execution history viewer | LOW | Visual execution timeline |

---

## F9: Access Control & User Management

| Sub-Feature | Complexity | Notes |
|---|---|---|
| User authentication (email/password) | MEDIUM | Standard auth flow with session management |
| SSO / OAuth (Google Workspace) | HIGH | Client is a Google shop; Google OAuth preferred |
| Role-based access: Admin vs. Business User | MEDIUM | Add exercise-level role assignment |
| Per-exercise user assignment | HIGH | Which users can access which exercises |
| Per-exercise role assignment (editor/viewer) | HIGH | Editors can classify; viewers can only see |
| User invitation via email | HIGH | Admin sends invite link |
| Admin dashboard (all exercises, all users) | MEDIUM | Per-exercise, per-user stats |
| Business user dashboard (my assignments) | HIGH | Filtered view of assigned exercises |

---

## F10: Audit Trail & History

| Sub-Feature | Complexity | Notes |
|---|---|---|
| Cell-level change logging | MEDIUM | Granularity: per-cell, not per-import |
| User attribution on every change | MEDIUM | Link to authenticated user |
| Change history viewer (per record) | HIGH | Click a record to see all changes over time |
| Audit log export (CSV) | MEDIUM | CSV export endpoint |
| Audit log filtering (by user, date, column, record) | MEDIUM | Extended query filters |
| Bulk change attribution | HIGH | Bulk edit logged as individual cell changes with bulk operation ID |

---

## F11: Notifications

| Sub-Feature | Complexity | Notes |
|---|---|---|
| In-app notification bell | LOW | Standard notification icon component |
| In-app notification list | LOW | Notification list panel |
| Email notifications | HIGH | SMTP or email API (SendGrid, SES, etc.) |
| Notification triggers: new records available | MEDIUM | Fire after source refresh |
| Notification triggers: deadline approaching | HIGH | Cron job checks deadlines, sends reminders |
| Notification triggers: admin message | HIGH | Admin can broadcast a message to assigned users |
| User notification preferences | HIGH | Per-user: email on/off, digest frequency |

---

## F12: Matrix/Pivot Table View (Stretch Goal)

| Sub-Feature | Complexity | Notes |
|---|---|---|
| Pivot mode configuration by admin | HIGH | Define row dims, column dims, value fields |
| AG Grid pivot rendering | MEDIUM | May require AG Grid Enterprise license |
| Cell editing in pivot mode | MEDIUM | Edit values within the matrix |
| Auto-computed columns (totals, averages) | MEDIUM | Row-level aggregation |
| Unpivot transform for export | HIGH | Flatten matrix to rows before BigQuery push |
| Pivot table validation | MEDIUM | Apply number range rules to matrix cells |

### AG Grid Licensing Note

AG Grid Community Edition supports basic grid features. The Matrix/Pivot Table view may require AG Grid Enterprise features (pivot mode, row grouping). If so, licensing costs should be factored into the project budget. Alternative: build a custom matrix component using the existing grid as a base.

---

## Priority & Phasing Recommendation

### Phase 1: Core Platform (MVP)

**Goal**: Replace one Google Sheet use case (Development Programming Classification)

Features: F1, F2 (BigQuery read only), F3, F4, F5, F6 (basic validation), F7 (basic reference tables), F9 (basic auth), F10 (basic audit)

**Estimated scope**: Building the exercise management system, spreadsheet UI, reference table management, validation engine, and BigQuery read connector.

### Phase 2: Automation & Polish

**Goal**: End-to-end automation with zero manual data movement

Features: F2 (BigQuery write), F8 (pipelines with BigQuery nodes), F11 (email notifications), F9 (user assignment, SSO), F10 (full audit)

**Estimated scope**: Pipeline engine with BigQuery destination. Email integration. Google OAuth.

### Phase 3: Advanced Use Cases

**Goal**: Support the draft ranking weights and future complex use cases

Features: F6 (dependent dropdowns, complex validation), F7 (hierarchical reference tables, BigQuery refresh), F12 (matrix view)

**Estimated scope**: Dependent dropdown engine. Pivot table UI. Unpivot transform.

### Phase 4: Scale & Self-Service

**Goal**: Any team member can create a new enrichment exercise without engineering help

Features: F1 (exercise duplication/templating), F8 (pipeline templates), F11 (advanced notifications with schedules), comprehensive admin dashboard

**Estimated scope**: UX polish, onboarding flows, exercise templates.
