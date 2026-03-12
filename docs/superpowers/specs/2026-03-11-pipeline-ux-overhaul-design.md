# Pipeline UX Overhaul - Design Spec

## Overview

Overhaul the pipeline builder UX to replace the raw JSON config editor with typed forms, add lifecycle management, live execution feedback, and save-time validation. Builds on the existing React Flow + Zustand architecture.

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
- Write mode selector: Merge | Append | Overwrite
- Merge key columns (comma-separated text input, shown only when Merge selected)

### Enrichment Exercise Form
- Exercise selector (dropdown fetched from `GET /api/v1/exercises`)
- Mode toggle: "Pass Through" or "Wait for Completion"
- Completion threshold slider (0-100%, shown only in Wait mode)

### Validation Gate Form
- Checkboxes for rules: "All required fields filled", "No validation errors", "Min completion %"
- Min completion threshold input (shown when that rule is checked)
- Fail action toggle: "Stop pipeline" or "Warn and continue"

### Transform Form
- Transform type selector: Filter | Map (aggregate/pivot/unpivot hidden since not yet implemented)
- Filter mode: text input for condition expression
- Map mode: key-value pairs for column rename/select

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
- Status badge next to the name showing draft/active/paused
- Trigger config section:
  - Trigger type selector: Manual | Scheduled | API
  - Scheduled: dropdown of presets (Daily at 2 AM, Hourly, Every 6 hours, Weekly Monday) plus custom cron input with human-readable preview
  - API: show webhook URL (read-only, copy button)
- Action buttons:
  - Save: disabled when clean, shows success/error toast, loading spinner while saving
  - Run: confirmation dialog before triggering, toast on start
  - Status toggle: Activate / Pause (only for saved pipelines)
  - Delete: confirmation dialog

### Feedback
- Toast notifications (react-hot-toast) for all actions: save, run, delete, status change
- Unsaved changes warning: browser `beforeunload` event + React Router navigation blocker when `isDirty` is true

## 3. Live Execution Status

### Polling Mechanism
- When a run is triggered, store the `runId` in the pipeline Zustand store
- Poll `GET /api/v1/pipelines/runs/:runId` every 2 seconds
- Response includes per-node run status (pending/running/success/failed/skipped)
- Stop polling when run status is terminal (success/failed/cancelled)

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
- Last Run tab shows: status, input row count, output row count, duration, error message (if failed)

### Run Progress Banner
- While a run is active: slim banner at top of canvas showing "Pipeline running... (3/6 nodes complete)"
- On completion: "Pipeline completed successfully" (green) or "Pipeline failed at [node name]" (red)
- Banner is dismissible

## 4. Save-time Validation

### Checks
1. Has at least one source node
2. No orphaned nodes (every node connected to at least one edge)
3. No cycles (client-side topological sort cycle detection)
4. Required config fields filled per node type
5. Trigger config valid (if scheduled, cron expression must parse)

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
- Polling via `setInterval` + React Query or `useEffect` cleanup
- Client-side cycle detection mirrors server's Kahn's algorithm
- Cron preview using a lightweight parser (or simple regex + lookup table for presets)
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
- `client/src/components/pipeline/NodeConfigDrawer.tsx` — route to per-type forms, add tabs
- `client/src/components/pipeline/PipelineToolbar.tsx` — trigger config, status badge, toasts, confirmation dialogs
- `client/src/components/pipeline/PipelineCanvas.tsx` — node status visuals, run banner
- `client/src/components/pipeline/nodes/*.tsx` — status border/icon rendering
- `client/src/stores/pipelineStore.ts` — run status tracking, active runId, polling state
- `client/src/pages/PipelineBuilderPage.tsx` — navigation blocker, polling lifecycle
