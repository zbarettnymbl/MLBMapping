# Pipeline UX Overhaul - Design Spec

## Overview

Overhaul the pipeline builder UX to replace the raw JSON config editor with typed forms, add lifecycle management, live execution feedback, and save-time validation. Builds on the existing React Flow + Zustand architecture.

## Out of Scope

- **Join node** — `join` exists in `PipelineNodeType` but has no config type or handler. It stays unimplemented; `NodePalette` should not offer it. If a pipeline somehow has a join node, the config drawer falls back to a read-only JSON view.
- **Aggregate/pivot/unpivot transforms** — listed in `TransformNodeConfig.transformType` but handlers only support `filter` and `map`. The Transform form hides these options. If an existing pipeline has one, the form falls back to read-only JSON view.

## 1. Node Configuration Forms

Replace the raw JSON editor in `NodeConfigDrawer.tsx` with per-node-type form components. The drawer header shows the node type icon and a label input field for renaming the node.

### BigQuery Source Form
- Credential selector (dropdown fetched from `GET /api/v1/credentials`)
- GCP Project ID (text input)
- Dataset (text input)
- Query type toggle: "Table" or "Custom SQL"
  - Table mode: table name text input
  - SQL mode: multiline textarea for custom query

### BigQuery Destination Form
- Credential selector (dropdown fetched from `GET /api/v1/credentials`)
- GCP Project ID, Dataset, Table name (text inputs)
- Write mode selector: merge | append | overwrite (display labels capitalized, stored values lowercase)
- Merge key columns (comma-separated text input, shown only when merge selected)

### Enrichment Exercise Form
- Exercise selector (dropdown fetched from `GET /api/v1/exercises`)
- Mode toggle: "Pass Through" (`pass_through`) or "Wait for Completion" (`wait_for_completion`)
- Completion threshold slider (0-100%, shown only in Wait mode)

### Validation Gate Form
- Checkboxes for rules: "All required fields filled", "No validation errors", "Min completion %"
- Min completion threshold input (shown when that rule is checked)
- Fail action toggle: "Stop pipeline" (`stop`) or "Warn and continue" (`warn_and_continue`)

### Transform Form
- Transform type selector: Filter | Map (aggregate/pivot/unpivot hidden; see Out of Scope)
- Filter mode: text input for condition expression
- Map mode: key-value pairs for column rename/select
- Fallback: read-only JSON view for unsupported transform types

### Notification Form
- Channel checkboxes: Email | In-App
- Recipient type selector: Admin | Assigned Users | Specific Users
- User ID list (shown when Specific Users selected)
- Message template textarea

### Form Behavior
- Each form validates required fields and shows inline errors
- Config changes update the Zustand store and mark pipeline as dirty
- Forms are rendered based on the selected node's `type` field

## 2. Pipeline Toolbar & Lifecycle UX

### Toolbar Enhancements
- Pipeline name input (existing, kept as-is)
- Status badge next to the name showing draft/active/paused (from `PipelineStatus` type)
- Trigger config section:
  - Trigger type selector: Manual | Cron | API (maps to `PipelineTriggerType` values `manual | cron | api`)
  - Cron: dropdown of presets (Daily at 2 AM, Hourly, Every 6 hours, Weekly Monday) plus custom cron input with human-readable preview via `cronstrue` npm package
  - API: display constructed webhook URL as `{baseUrl}/api/v1/pipelines/{id}/run` (read-only, copy button). The `webhookSecret` from `triggerConfig` is shown separately for authentication.
- Action buttons:
  - Save: disabled when clean, shows success/error toast, loading spinner while saving
  - Run: confirmation dialog before triggering ("Run this pipeline now?"), toast on start
  - Status toggle: Activate / Pause (only for saved pipelines)
  - Delete: confirmation dialog, navigates to `/pipelines` after successful deletion

### New API Endpoint: Status Change
- `PATCH /api/v1/pipelines/:id/status` with body `{ status: 'active' | 'paused' | 'draft' }`
- Add `updatePipelineStatus(id, status)` to `client/src/api/pipelines.ts`

### Feedback
- Toast notifications (react-hot-toast) for all actions: save, run, delete, status change
- Unsaved changes warning: browser `beforeunload` event + React Router `useBlocker` hook when `isDirty` is true

## 3. Live Execution Status

### Polling Mechanism
- When a run is triggered via the toolbar, store the `runId` in the pipeline Zustand store
- Poll using the existing `fetchRunDetail(runId)` API client function every 2 seconds via `useEffect` + `setInterval` with cleanup
- Response includes per-node run details with status (pending/running/success/failed/skipped)
- Stop polling when run status is terminal (success/failed/cancelled)
- The existing `PipelineRunsPage` is not modified; it remains a separate historical view. The in-canvas status is for live feedback only.

### Visual Node Status
- Each custom node component reads its run status from the store
- Status indicators on nodes:
  - Pending: gray dotted border
  - Running: amber border with subtle pulse animation
  - Success: green border with checkmark icon
  - Failed: red border with X icon
  - Skipped: muted/dimmed appearance
- Status clears when user begins editing the pipeline again

### Node Run Details
- Click a node after a run to see execution result in the config drawer
- Drawer gets two tabs: "Config" and "Last Run"
- Last Run tab shows: status, input row count, output row count, duration (computed client-side as `completedAt - startedAt`), error message (if failed)

### Run Progress Banner
- While a run is active: slim banner at top of canvas showing "Pipeline running... (3/6 nodes complete)"
- On completion: "Pipeline completed successfully" (green) or "Pipeline failed at [node name]" (red)
- Banner is dismissible

## 4. Save-time Validation

### Checks
1. Has at least one source node (type `bigquery_source`)
2. No orphaned nodes (every node connected to at least one edge)
3. No cycles (client-side topological sort cycle detection, mirrors server's Kahn's algorithm)
4. Required config fields filled per node type
5. Trigger config valid (if cron, expression must parse)

### Error Presentation
- Validation errors shown in a toast or error panel listing all issues
- Nodes with config errors get a red warning badge on the canvas
- Clicking an error pans to the offending node and opens its config drawer

### Out of Scope for Validation
- Whether credentials actually work (runtime concern)
- Whether exercises exist (dropdown prevents invalid selection)
- Data compatibility between connected nodes

## Technical Approach

- Build on existing React Flow + Zustand architecture
- New components in `client/src/components/pipeline/config/` for per-node-type forms
- Polling via `useEffect` + `setInterval` with cleanup on unmount or terminal status
- Client-side cycle detection mirrors server's Kahn's algorithm
- Cron preview using `cronstrue` npm package for human-readable descriptions
- No WebSocket needed; 2s polling is sufficient for sequential node execution

## Files Affected

### New Files
- `client/src/components/pipeline/config/BigQuerySourceForm.tsx`
- `client/src/components/pipeline/config/BigQueryDestinationForm.tsx`
- `client/src/components/pipeline/config/EnrichmentExerciseForm.tsx`
- `client/src/components/pipeline/config/ValidationGateForm.tsx`
- `client/src/components/pipeline/config/TransformForm.tsx`
- `client/src/components/pipeline/config/NotificationForm.tsx`
- `client/src/components/pipeline/RunProgressBanner.tsx`
- `client/src/components/pipeline/TriggerConfigPanel.tsx`
- `client/src/utils/pipelineValidation.ts`

### Modified Files
- `client/src/components/pipeline/NodeConfigDrawer.tsx` — route to per-type forms, add Config/Last Run tabs
- `client/src/components/pipeline/NodePalette.tsx` — ensure join node is not offered
- `client/src/components/pipeline/PipelineToolbar.tsx` — trigger config, status badge, toasts, confirmation dialogs
- `client/src/components/pipeline/PipelineCanvas.tsx` — node status visuals, run banner
- `client/src/components/pipeline/nodes/*.tsx` — status border/icon rendering
- `client/src/stores/pipelineStore.ts` — add `status: PipelineStatus` field, run status tracking, active runId, node run results map
- `client/src/pages/PipelineBuilderPage.tsx` — navigation blocker via `useBlocker`, polling lifecycle
- `client/src/api/pipelines.ts` — add `updatePipelineStatus()` function
- `server/src/routes/pipelines.ts` — add `PATCH /:id/status` endpoint
