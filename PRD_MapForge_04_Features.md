# MapForge PRD -- Part 4: Feature Specifications & DataForge Component Mapping

---

## Feature Matrix: What to Build vs. What to Reuse

This section maps every MapForge feature to existing DataForge components, identifying what can be reused directly, what needs adaptation, and what is net-new.

### Legend

- **REUSE** -- Existing DataForge component can be used with minimal changes
- **ADAPT** -- Existing component provides the foundation but needs meaningful modification
- **NEW** -- No existing component; must be built from scratch

---

## F1: Enrichment Exercise Manager

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| Exercise CRUD (create, read, update, delete) | ADAPT | `Template` model + `TemplateForm.tsx` | Template becomes an "exercise" with source config attached |
| Exercise lifecycle (draft, active, paused, archived) | REUSE | `Template.status` field | Add "paused" status |
| Exercise versioning | REUSE | `TemplateVersion` model | Snapshot on publish |
| Exercise duplication | ADAPT | Template export/import (`TemplateExport` type) | Clone an exercise with its full config |

### Data Model Mapping

```
DataForge Template -> MapForge Enrichment Exercise

Template {                    EnrichmentExercise {
  id                            id
  name                          name
  description                   description
  version                       version
  status                        status: draft | active | paused | archived
  columns: TemplateColumn[]     sourceColumns: ExerciseColumn[]   // read-only
                                classificationColumns: ExerciseColumn[]  // editable
  createdAt                     createdAt
  updatedAt                     updatedAt
                          +     sourceConfig: BigQuerySourceConfig | FileSourceConfig
                          +     uniqueKeyColumns: string[]
                          +     refreshSchedule: CronConfig | null
                          +     assignedUsers: UserAssignment[]
                          +     deadline: Date | null
                          +     viewMode: 'flat' | 'matrix'
}
```

---

## F2: BigQuery Integration Layer

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| BigQuery connection configuration | NEW | -- | GCP auth, project/dataset/table selection |
| BigQuery query execution | NEW | -- | Run SQL, return results |
| BigQuery schema detection | NEW | -- | Auto-detect columns and types from query results |
| BigQuery write (batch) | NEW | Export node concept from `ExportConfig.tsx` | Merge/append/overwrite modes |
| BigQuery write (streaming) | NEW | -- | Real-time push via BigQuery streaming insert API |
| BigQuery connection testing | NEW | -- | Validate credentials and query before saving |
| Connection credential storage | ADAPT | `server/src/routes/apiKeys.ts` | Store GCP credentials securely; reuse API key vault pattern |

### Technical Considerations

- Use the `@google-cloud/bigquery` Node.js client library
- Service Account JSON key stored encrypted in the database (similar to how DataForge stores API keys)
- Query results cached in PostgreSQL (the MapForge database) to avoid repeated BigQuery hits
- BigQuery streaming inserts for real-time mode; batch loads for scheduled mode
- Cost awareness: BigQuery charges per byte scanned -- cache aggressively

---

## F3: Source Data Sync Engine

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| Initial data pull | ADAPT | `FileSourceConfig.tsx` pipeline node | First pull when exercise is published |
| Incremental refresh | NEW | -- | Detect new/changed/removed records by unique key |
| Record state tracking (new, existing, changed, removed) | NEW | -- | State machine per record |
| Source data caching in PostgreSQL | ADAPT | `spreadsheets` table concept | Store source snapshots locally |
| Unique key matching | NEW | -- | Join source data to existing classifications by composite key |
| Schema drift detection | NEW | -- | Alert when BigQuery schema changes |

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

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| Per-cell value storage | ADAPT | Spreadsheet data model (`shared/src/types/spreadsheet.ts`) | Store classification values keyed by record ID + column |
| Auto-save on edit | ADAPT | SpreadsheetGrid cell editing | Debounced save, optimistic UI |
| Conflict resolution | NEW | -- | If two users edit the same record simultaneously |
| Classification history per cell | NEW | -- | Linked to audit log |
| Computed/rollup column evaluation | ADAPT | `TemplateTransform` (column type) | Evaluate on every dependent cell change |
| Default value population | REUSE | `TemplateColumn.defaultValue` | Applied to new records automatically |

### Database Schema (Conceptual)

```sql
-- Core tables (adapted from DataForge)
enrichment_exercises       -- adapted from templates
exercise_columns           -- adapted from template_columns
exercise_source_configs    -- NEW: BigQuery/file connection details
reference_tables           -- REUSE from DataForge
reference_table_rows       -- REUSE from DataForge

-- Classification data (NEW)
source_records             -- cached source data rows, keyed by unique composite key
classification_values      -- per-cell values: (record_id, column_id, value, updated_by, updated_at)
classification_history     -- audit trail: (record_id, column_id, old_value, new_value, user_id, timestamp)

-- Record lifecycle (NEW)
record_states              -- (record_id, state: new|existing|changed|removed|archived, since)

-- User management (adapted from DataForge)
users                      -- adapted from existing auth
user_exercise_assignments  -- NEW: which users can access which exercises
```

---

## F5: Spreadsheet UI (Enrichment Mode)

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| AG Grid spreadsheet with virtual scrolling | REUSE | `SpreadsheetGrid.tsx` | Already handles 10K+ rows |
| Read-only source columns (left side) | ADAPT | `TemplateColumn.lockCells` | Visual distinction: gray background, lock icon |
| Editable classification columns (right side) | ADAPT | AG Grid cell editors | Dropdown, text, number, date editors |
| Inline dropdown editor with search/filter | ADAPT | AG Grid select editor | Add search within dropdown for long picklist |
| Dependent dropdown filtering | NEW | -- | When parent value changes, child dropdown options update |
| Cell-level validation highlighting | REUSE | `ErrorCellRenderer.tsx`, `CellErrorPopover.tsx` | Red border + hover tooltip |
| Row status indicator | REUSE | `RowStatusRenderer.tsx` | Classified/Unclassified/Error states |
| Column header with type indicator | REUSE | `ColumnHeaderRenderer.tsx` | Show data type icon, required badge |
| Quick filter bar (All/Unclassified/Classified/Errors) | ADAPT | AG Grid filtering | New filter preset buttons above the grid |
| Multi-row selection + bulk edit | ADAPT | AG Grid range selection | Add "Apply to Selected" action panel |
| Progress bar header | REUSE | `ProgressBar` component | Show X of Y classified |
| Keyboard navigation (Tab to next editable cell) | ADAPT | AG Grid navigation | Skip read-only cells on Tab |
| "New record" highlight | NEW | -- | Visual indicator for records added in latest refresh |
| "Source changed" indicator | NEW | -- | Flag records where source data changed since last classification |

### Visual Design

Following DataForge's "Industrial Precision" design system:

- **Source columns**: `bg-forge-900` background, `text-forge-400` text, subtle lock icon in header
- **Classification columns**: `bg-forge-950` background (darker = editable), `text-forge-50` text, amber header accent
- **Unclassified row**: Left border `border-l-2 border-amber-500/40`
- **Classified row**: Left border `border-l-2 border-status-clean`
- **Error row**: Left border `border-l-2 border-status-error`
- **New record**: `bg-cyan-950/20` row background with "NEW" badge
- **Dropdown editor**: `bg-forge-800` with `ring-amber-500/40` focus ring

---

## F6: Validation Engine

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| Required field validation | REUSE | `TemplateColumn.required` | Auto-generated for required classification columns |
| Picklist membership validation | REUSE | `ValidationRuleData` (type: 'enum') | Ensure value is in the allowed list |
| Number range validation | REUSE | `ValidationRuleData` (type: 'range') | Min/max for numeric columns |
| Date range validation | REUSE | `ValidationRuleData` (type: 'date_range') | Min/max dates |
| Regex pattern validation | REUSE | `ValidationRuleData` (type: 'regex') | For text columns |
| Dependent dropdown validation | NEW | -- | "If column A = X, column B must be in [Y1, Y2, Y3]" |
| Cross-column relational rules | REUSE | `RelationalRule` model | Complex multi-column constraints |
| Conditional required rules | REUSE | `ConditionalRequiredConfig` | "If A is filled, B is required" |
| Custom JavaScript validation hooks | REUSE | `ValidationHook` model | For complex business logic |
| Client-side validation (instant) | ADAPT | SpreadsheetGrid validation | Run picklist/required checks in-browser |
| Server-side validation (on save) | REUSE | Validation engine in server | Full validation on every save |
| Validation summary statistics | ADAPT | Review pane logic | Count errors/warnings/complete per exercise |
| Validation webhook (external service) | REUSE | `ValidationWebhook` model | Call external API to validate values |

### Dependent Dropdown Implementation

This is the most important new validation feature. Implementation approach:

```typescript
// New type added to TemplateColumn.config
interface DependentPicklistConfig {
  parentColumnKey: string;           // e.g., "sportCategory"
  valueMap: Record<string, string[]>; // e.g., { "Boys Baseball": ["MLB ID Tour", ...] }
  // OR
  referenceTableId: string;          // Reference table with parent-child hierarchy
  parentReferenceColumn: string;     // Column in ref table that matches parent value
  childReferenceColumn: string;      // Column in ref table to pull child values from
}
```

**DataForge parallel**: The `ColumnReferenceLink` type (template.ts lines 560-568) provides the column-to-reference-table link. The `RelationalRule` expression engine can enforce the constraint. The UI would extend the AG Grid cell editor to dynamically filter options.

---

## F7: Reference Tables (Enhanced)

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| CRUD for reference tables | REUSE | `server/src/routes/referenceTables.ts` | Full REST API exists |
| CSV import for reference data | REUSE | Reference table bulk import | Existing feature |
| Manual row editing | REUSE | Reference table row management | Add/edit/delete rows |
| BigQuery as refresh source | NEW | Extends `ReferenceTable.refreshSource` | Pull reference data from BigQuery on schedule |
| Hierarchical column relationships | NEW | -- | Parent-child within a reference table |
| Link reference table to classification column | REUSE | `ColumnReferenceLink` model | Existing feature |
| Reference table versioning | NEW | -- | Track changes to reference data over time |
| Cross-exercise reference table sharing | REUSE | Organization-scoped reference tables | Already org-level |

---

## F8: Pipeline Engine (Enhanced)

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| Visual DAG builder | REUSE | `PipelineCanvas.tsx` (React Flow) | Drag-and-drop pipeline builder |
| BigQuery Source node | NEW | Extends `FileSourceConfig.tsx` | New node type |
| Enrichment Exercise node | NEW | -- | References an exercise; waits for completion or passes through current state |
| Validation Gate node | REUSE | `ValidationGateConfig.tsx` | Pass/fail based on validation results |
| Transform node (unpivot, pivot, aggregate, filter) | ADAPT | `SheetTransformConfig.tsx`, `AggregateConfig.tsx`, `FilterConfig.tsx` | Add unpivot transform |
| BigQuery Destination node | NEW | Extends `ExportConfig.tsx` | New export target type |
| Notification node | REUSE | `NotificationConfig.tsx` | Email + in-app notifications |
| Join node | REUSE | `JoinConfig.tsx` | Join datasets in the pipeline |
| Cron trigger | REUSE | `TriggerConfig.tsx` | Schedule-based execution |
| Manual trigger | REUSE | Pipeline run API | On-demand execution |
| API trigger | REUSE | Pipeline trigger API | Webhook-based execution |
| Execution logging | REUSE | `PipelineRun` + `PipelineNodeExecution` models | Per-node status tracking |
| Execution history viewer | REUSE | `PipelineRunViewer.tsx` | Visual execution timeline |

---

## F9: Access Control & User Management

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| User authentication (email/password) | ADAPT | `server/src/routes/auth.ts` | Existing auth flow |
| SSO / OAuth (Google Workspace) | NEW | -- | Client is a Google shop; Google OAuth preferred |
| Role-based access: Admin vs. Business User | ADAPT | Organization roles | Add exercise-level assignment |
| Per-exercise user assignment | NEW | -- | Which users can access which exercises |
| Per-exercise role assignment (editor/viewer) | NEW | -- | Editors can classify; viewers can only see |
| User invitation via email | NEW | -- | Admin sends invite link |
| Admin dashboard (all exercises, all users) | ADAPT | `server/src/routes/dashboard.ts` | Extend with per-exercise, per-user stats |
| Business user dashboard (my assignments) | NEW | -- | Filtered view of assigned exercises |

---

## F10: Audit Trail & History

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| Cell-level change logging | ADAPT | `server/src/routes/auditLog.ts` | Granularity: per-cell, not per-import |
| User attribution on every change | ADAPT | Audit log user field | Link to authenticated user |
| Change history viewer (per record) | NEW | -- | Click a record to see all changes over time |
| Audit log export (CSV) | ADAPT | Audit log API | Add CSV export endpoint |
| Audit log filtering (by user, date, column, record) | ADAPT | Audit log API query params | Extend filters |
| Bulk change attribution | NEW | -- | Bulk edit logged as individual cell changes with bulk operation ID |

---

## F11: Notifications

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| In-app notification bell | REUSE | `NotificationBell.tsx` | Existing component |
| In-app notification list | REUSE | Notification system | Existing |
| Email notifications | NEW | -- | SMTP or email API (SendGrid, SES, etc.) |
| Notification triggers: new records available | ADAPT | Pipeline notification node | Fire after source refresh |
| Notification triggers: deadline approaching | NEW | -- | Cron job checks deadlines, sends reminders |
| Notification triggers: admin message | NEW | -- | Admin can broadcast a message to assigned users |
| User notification preferences | NEW | -- | Per-user: email on/off, digest frequency |

---

## F12: Matrix/Pivot Table View (Stretch Goal)

| Sub-Feature | Status | DataForge Reference | Notes |
|---|---|---|---|
| Pivot mode configuration by admin | NEW | -- | Define row dims, column dims, value fields |
| AG Grid pivot rendering | ADAPT | AG Grid Enterprise pivot mode | May require AG Grid Enterprise license |
| Cell editing in pivot mode | ADAPT | AG Grid cell editors | Edit values within the matrix |
| Auto-computed columns (totals, averages) | ADAPT | `TemplateTransform` column type | Row-level aggregation |
| Unpivot transform for export | NEW | Pipeline transform node | Flatten matrix to rows before BigQuery push |
| Pivot table validation | ADAPT | Validation engine | Apply number range rules to matrix cells |

### AG Grid Licensing Note

AG Grid Community Edition (currently used by DataForge) supports basic grid features. The Matrix/Pivot Table view may require AG Grid Enterprise features (pivot mode, row grouping). If so, licensing costs should be factored into the project budget. Alternative: build a custom matrix component using the existing grid as a base.

---

## Priority & Phasing Recommendation

### Phase 1: Core Platform (MVP)

**Goal**: Replace one Google Sheet use case (Development Programming Classification)

Features: F1, F2 (BigQuery read only), F3, F4, F5, F6 (basic validation), F7 (basic reference tables), F9 (basic auth), F10 (basic audit)

**Estimated scope**: Adapting DataForge's template, spreadsheet, reference table, and validation systems. Adding BigQuery read connector.

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
