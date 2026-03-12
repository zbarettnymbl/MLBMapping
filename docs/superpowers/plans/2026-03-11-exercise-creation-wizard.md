# Exercise Creation Wizard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 9-step admin wizard for creating enrichment exercises end-to-end: exercise metadata, BigQuery source config, column definition, classification columns, validation rules, reference table linking, user assignment, pipeline setup (optional), and publish.

**Architecture:** A multi-step wizard page with a Zustand store tracking wizard state. Each step is an independent component that writes to the store. The wizard uses the existing API routes (exercise CRUD, BigQuery test/preview, reference tables, user assignments) -- no new server routes needed beyond what Plans 1-3 provide. On publish, the wizard calls `POST /exercises/:id/publish` which transitions the exercise to ACTIVE and triggers the initial data sync.

**Tech Stack:** React 19, Zustand, React Query, Tailwind CSS 4, existing common components (Button, Card, Input, Select, Modal, Tabs), Vitest + React Testing Library

**Depends on:** BigQuery Integration (Plan 1), Source Data Sync (Plan 2), Enhanced Reference Tables (Plan 3).

---

## File Structure

| File | Responsibility |
|------|---------------|
| `client/src/pages/ExerciseWizardPage.tsx` | Wizard container with step navigation |
| `client/src/stores/exerciseWizardStore.ts` | Zustand store for wizard state across all 9 steps |
| `client/src/components/wizard/WizardStepper.tsx` | Step indicator bar (numbered steps with status) |
| `client/src/components/wizard/Step1ExerciseInfo.tsx` | Name, description, icon/color |
| `client/src/components/wizard/Step2DataSource.tsx` | BigQuery connection config, test, preview |
| `client/src/components/wizard/Step3SourceColumns.tsx` | Auto-detected columns with labels, visibility, reorder |
| `client/src/components/wizard/Step4ClassificationColumns.tsx` | Add/edit classification columns with data type config |
| `client/src/components/wizard/Step5ValidationRules.tsx` | Required fields, cross-column rules, custom expressions |
| `client/src/components/wizard/Step6ReferenceTables.tsx` | Link/create reference tables for picklist columns |
| `client/src/components/wizard/Step7UserAssignment.tsx` | Search users, assign editor/viewer roles, set deadline |
| `client/src/components/wizard/Step8Pipeline.tsx` | Optional pipeline config (placeholder for Pipeline Engine) |
| `client/src/components/wizard/Step9Publish.tsx` | Review summary and publish button |
| `client/src/components/wizard/ColumnConfigPanel.tsx` | Shared panel for configuring column properties |
| `shared/src/types/wizard.ts` | Types for wizard state |
| `server/src/routes/exercises.ts` | Add `POST /exercises/:id/publish` endpoint |

---

## Chunk 1: Wizard Infrastructure

### Task 1: Wizard Types

**Files:**
- Create: `shared/src/types/wizard.ts`
- Modify: `shared/src/types/index.ts`

- [ ] **Step 1: Define wizard state types**

```typescript
// shared/src/types/wizard.ts
import type { ExerciseColumn, BigQueryConnectionConfig } from './index';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface WizardExerciseInfo {
  name: string;
  description: string;
  viewMode: 'flat' | 'matrix';
}

export interface WizardDataSource {
  connectionConfig: BigQueryConnectionConfig | null;
  refreshSchedule: string | null; // cron expression
  isConnected: boolean;
  previewRows: Record<string, unknown>[];
}

export interface WizardSourceColumn {
  key: string;
  label: string;
  originalType: string;
  visible: boolean;
  ordinal: number;
}

export interface WizardClassificationColumn {
  key: string;
  label: string;
  description: string;
  dataType: ExerciseColumn['dataType'];
  required: boolean;
  defaultValue: string | null;
  config: ExerciseColumn['config'];
  referenceLink: ExerciseColumn['referenceLink'];
  dependentConfig: ExerciseColumn['dependentConfig'];
  ordinal: number;
}

export interface WizardUserAssignment {
  userId: string;
  email: string;
  name: string;
  role: 'editor' | 'viewer';
}

export interface WizardValidationRule {
  id: string; // client-side temp ID
  type: 'required' | 'cross_column' | 'custom';
  config: Record<string, unknown>;
  severity: 'error' | 'warning';
  message: string;
  targetColumnKey: string;
}
```

- [ ] **Step 2: Export from shared index**

Add `export * from './wizard';` to `shared/src/types/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add shared/src/types/wizard.ts shared/src/types/index.ts
git commit -m "feat: add shared wizard state types"
```

---

### Task 2: Wizard Zustand Store

**Files:**
- Create: `client/src/stores/exerciseWizardStore.ts`

- [ ] **Step 1: Implement wizard store**

```typescript
// client/src/stores/exerciseWizardStore.ts
import { create } from 'zustand';
import type {
  WizardStep,
  WizardExerciseInfo,
  WizardDataSource,
  WizardSourceColumn,
  WizardClassificationColumn,
  WizardUserAssignment,
  WizardValidationRule,
} from '@mapforge/shared';

interface ExerciseWizardState {
  // Navigation
  currentStep: WizardStep;
  exerciseId: string | null; // set after step 1 creates the exercise

  // Step data
  exerciseInfo: WizardExerciseInfo;
  dataSource: WizardDataSource;
  sourceColumns: WizardSourceColumn[];
  classificationColumns: WizardClassificationColumn[];
  validationRules: WizardValidationRule[];
  uniqueKeyColumns: string[];
  userAssignments: WizardUserAssignment[];
  deadline: string | null;

  // Actions
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setExerciseId: (id: string) => void;
  setExerciseInfo: (info: Partial<WizardExerciseInfo>) => void;
  setDataSource: (source: Partial<WizardDataSource>) => void;
  setSourceColumns: (columns: WizardSourceColumn[]) => void;
  setUniqueKeyColumns: (keys: string[]) => void;
  addClassificationColumn: (col: WizardClassificationColumn) => void;
  updateClassificationColumn: (key: string, updates: Partial<WizardClassificationColumn>) => void;
  removeClassificationColumn: (key: string) => void;
  setValidationRules: (rules: WizardValidationRule[]) => void;
  setUserAssignments: (assignments: WizardUserAssignment[]) => void;
  setDeadline: (deadline: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1 as WizardStep,
  exerciseId: null,
  exerciseInfo: { name: '', description: '', viewMode: 'flat' as const },
  dataSource: { connectionConfig: null, refreshSchedule: null, isConnected: false, previewRows: [] },
  sourceColumns: [],
  classificationColumns: [],
  validationRules: [],
  uniqueKeyColumns: [],
  userAssignments: [],
  deadline: null,
};

export const useExerciseWizardStore = create<ExerciseWizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 9) as WizardStep })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) as WizardStep })),
  setExerciseId: (id) => set({ exerciseId: id }),
  setExerciseInfo: (info) => set((s) => ({ exerciseInfo: { ...s.exerciseInfo, ...info } })),
  setDataSource: (source) => set((s) => ({ dataSource: { ...s.dataSource, ...source } })),
  setSourceColumns: (columns) => set({ sourceColumns: columns }),
  setUniqueKeyColumns: (keys) => set({ uniqueKeyColumns: keys }),

  addClassificationColumn: (col) => set((s) => ({
    classificationColumns: [...s.classificationColumns, col],
  })),
  updateClassificationColumn: (key, updates) => set((s) => ({
    classificationColumns: s.classificationColumns.map(c =>
      c.key === key ? { ...c, ...updates } : c
    ),
  })),
  removeClassificationColumn: (key) => set((s) => ({
    classificationColumns: s.classificationColumns.filter(c => c.key !== key),
  })),

  setValidationRules: (rules) => set({ validationRules: rules }),
  setUserAssignments: (assignments) => set({ userAssignments: assignments }),
  setDeadline: (deadline) => set({ deadline }),
  reset: () => set(initialState),
}));
```

- [ ] **Step 2: Commit**

```bash
git add client/src/stores/exerciseWizardStore.ts
git commit -m "feat: add Zustand store for exercise creation wizard"
```

---

### Task 3: Wizard Stepper Component

**Files:**
- Create: `client/src/components/wizard/WizardStepper.tsx`

- [ ] **Step 1: Implement step indicator**

A horizontal numbered step bar showing all 9 steps with labels, current step highlighted, completed steps with checkmark, clickable to navigate back to completed steps.

Labels: 1-Exercise, 2-Source, 3-Columns, 4-Classification, 5-Validation, 6-References, 7-Users, 8-Pipeline, 9-Publish

- [ ] **Step 2: Commit**

```bash
git add client/src/components/wizard/WizardStepper.tsx
git commit -m "feat: add wizard stepper navigation component"
```

---

### Task 4: Wizard Page Container

**Files:**
- Create: `client/src/pages/ExerciseWizardPage.tsx`
- Modify: `client/src/App.tsx` (add route)

- [ ] **Step 1: Implement wizard page**

The page reads `currentStep` from the wizard store and renders the appropriate step component. Includes the WizardStepper at the top and Next/Back buttons at the bottom.

- [ ] **Step 2: Add route to App.tsx**

Add route: `/exercises/new` -> `ExerciseWizardPage`

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ExerciseWizardPage.tsx client/src/App.tsx
git commit -m "feat: add exercise wizard page with step routing"
```

---

## Chunk 2: Wizard Steps 1-4

### Task 5: Step 1 -- Exercise Info

**Files:**
- Create: `client/src/components/wizard/Step1ExerciseInfo.tsx`

- [ ] **Step 1: Implement step 1 form**

Fields: Name (required), Description (textarea), View Mode (flat/matrix radio). On "Next", creates the exercise via `POST /api/v1/exercises` and stores the returned ID in the wizard store.

Uses existing `Input` and `Button` components from `client/src/components/common/`.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/wizard/Step1ExerciseInfo.tsx
git commit -m "feat: add wizard step 1 - exercise info"
```

---

### Task 6: Step 2 -- Data Source

**Files:**
- Create: `client/src/components/wizard/Step2DataSource.tsx`

- [ ] **Step 1: Implement data source configuration form**

Fields: Credential selector (dropdown of stored credentials), GCP Project, Dataset, Table/Query toggle, Table name or SQL textarea, Refresh schedule (Manual/Hourly/Daily/Weekly/Custom Cron).

Actions: "Test Connection" button calls `POST /api/v1/bigquery/test-connection`. On success, shows preview data from `POST /api/v1/bigquery/preview`. Unique key column selection (checkboxes on detected columns).

On "Next", saves BigQuery source config via `POST /api/v1/exercises/:id` (update with source config) or a dedicated source config endpoint.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/wizard/Step2DataSource.tsx
git commit -m "feat: add wizard step 2 - BigQuery data source config"
```

---

### Task 7: Step 3 -- Source Columns

**Files:**
- Create: `client/src/components/wizard/Step3SourceColumns.tsx`

- [ ] **Step 1: Implement source column configuration**

Shows auto-detected columns from the BigQuery preview. For each column: display label (editable input, defaults to BQ column name), visibility toggle (show/hide to business users), drag handle for reordering. All source columns are automatically read-only.

Uses the `sourceColumns` from the wizard store (populated in Step 2 from preview results).

- [ ] **Step 2: Commit**

```bash
git add client/src/components/wizard/Step3SourceColumns.tsx
git commit -m "feat: add wizard step 3 - source column configuration"
```

---

### Task 8: Step 4 -- Classification Columns

**Files:**
- Create: `client/src/components/wizard/Step4ClassificationColumns.tsx`
- Create: `client/src/components/wizard/ColumnConfigPanel.tsx`

- [ ] **Step 1: Implement classification column editor**

"Add Classification Column" button opens the ColumnConfigPanel. For each column: name, description, data type selector (picklist, multi_select, text, number, date, boolean), required toggle, default value.

Per-type config:
- Picklist/Multi-select: manual value list OR link to reference table
- Text: regex pattern, min/max length
- Number: integer/decimal, min/max value
- Date: format, min/max date
- Boolean: true/false labels

For picklist: option to configure dependent dropdown (select parent column, reference table, parent/child columns).

- [ ] **Step 2: Implement ColumnConfigPanel**

Reusable slide-over panel for configuring a single column's properties. Used in Step 4 for adding/editing classification columns.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/wizard/Step4ClassificationColumns.tsx client/src/components/wizard/ColumnConfigPanel.tsx
git commit -m "feat: add wizard step 4 - classification column editor with config panel"
```

---

## Chunk 3: Wizard Steps 5-9

### Task 9: Step 5 -- Validation Rules

**Files:**
- Create: `client/src/components/wizard/Step5ValidationRules.tsx`

- [ ] **Step 1: Implement validation rules editor**

Auto-generates required field rules for required columns (read-only display). "Add Rule" button for cross-column rules with form: rule type (cross_column/custom), target column, condition expression, severity (error/warning), error message.

Cross-column rule builder: "If [column A] = [value], then [column B] must be one of [values]". Custom expression textarea for advanced rules.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/wizard/Step5ValidationRules.tsx
git commit -m "feat: add wizard step 5 - validation rules editor"
```

---

### Task 10: Step 6 -- Reference Tables

**Files:**
- Create: `client/src/components/wizard/Step6ReferenceTables.tsx`

- [ ] **Step 1: Implement reference table linking**

Shows all classification columns that use picklist/multi_select type. For each: shows current reference table link (if any), "Link to Reference Table" dropdown of existing tables, "Create New" button that opens a modal for inline reference table creation (name, manual rows, or CSV upload).

Uses the reference table API from Plan 3.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/wizard/Step6ReferenceTables.tsx
git commit -m "feat: add wizard step 6 - reference table linking"
```

---

### Task 11: Step 7 -- User Assignment

**Files:**
- Create: `client/src/components/wizard/Step7UserAssignment.tsx`

- [ ] **Step 1: Implement user assignment**

User search input (searches by email or name against `GET /api/v1/admin/users`). Assigned users table with columns: Name, Email, Role (editor/viewer dropdown), Remove button. Deadline date picker.

On "Next", saves assignments via `POST /api/v1/exercises/:id/assignments` for each user.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/wizard/Step7UserAssignment.tsx
git commit -m "feat: add wizard step 7 - user assignment"
```

---

### Task 12: Step 8 -- Pipeline (Placeholder)

**Files:**
- Create: `client/src/components/wizard/Step8Pipeline.tsx`

- [ ] **Step 1: Implement pipeline placeholder step**

Shows a message: "Pipeline configuration is optional. You can set up automated data pipelines after publishing this exercise." with a "Skip" button. This step will be fully implemented when the Pipeline Engine (Plan 5) is built.

If Pipeline Engine is available, this step would embed a simplified version of the pipeline builder with pre-configured source and exercise nodes.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/wizard/Step8Pipeline.tsx
git commit -m "feat: add wizard step 8 - pipeline placeholder"
```

---

### Task 13: Step 9 -- Review & Publish

**Files:**
- Create: `client/src/components/wizard/Step9Publish.tsx`

- [ ] **Step 1: Implement review and publish**

Read-only summary of all wizard state: exercise name/description, data source connection details, source column count, classification column list, validation rule count, reference table links, assigned users, deadline.

"Publish" button calls `POST /api/v1/exercises/:id/publish` which:
1. Validates all required config is present
2. Transitions exercise status from DRAFT to ACTIVE
3. Triggers initial data sync from BigQuery
4. Returns success with sync result

On success, redirects to the admin dashboard.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/wizard/Step9Publish.tsx
git commit -m "feat: add wizard step 9 - review and publish"
```

---

### Task 14: Publish API Endpoint

**Files:**
- Modify: `server/src/routes/exercises.ts`

- [ ] **Step 1: Add publish endpoint**

```typescript
// POST /api/v1/exercises/:id/publish
router.post('/:id/publish', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify exercise exists and is in draft status
    const [exercise] = await db.select().from(enrichmentExercises)
      .where(eq(enrichmentExercises.id, id));

    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    if (exercise.status !== 'draft') {
      res.status(400).json({ error: `Cannot publish exercise in ${exercise.status} status` });
      return;
    }

    // Transition to active
    await db.update(enrichmentExercises)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(enrichmentExercises.id, id));

    // Trigger initial data sync
    let syncResult = null;
    try {
      const { syncExerciseData } = await import('../services/source-sync');
      syncResult = await syncExerciseData(id);
    } catch (syncError) {
      console.error('Initial sync failed:', syncError);
      // Don't fail the publish -- the exercise is active, sync can be retried
    }

    // Register sync schedule if configured
    try {
      const { bigquerySources } = await import('../db/schema');
      const [source] = await db.select().from(bigquerySources)
        .where(eq(bigquerySources.exerciseId, id));
      if (source?.refreshSchedule) {
        const { scheduleSync } = await import('../services/sync-scheduler');
        scheduleSync(id, source.refreshSchedule);
      }
    } catch (scheduleError) {
      console.error('Failed to register sync schedule:', scheduleError);
    }

    res.json({
      status: 'active',
      syncResult,
    });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ error: 'Failed to publish exercise' });
  }
});
```

- [ ] **Step 2: Add exercise creation endpoint (full)**

Enhance the exercise creation route to accept the full wizard payload and create the exercise with all its columns, source config, and assignments in a single transaction.

```typescript
// POST /api/v1/exercises -- create exercise (from wizard step 1, or full payload)
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, description, viewMode } = req.body;

    const [exercise] = await db.insert(enrichmentExercises).values({
      orgId: req.user!.orgId,
      name,
      description,
      viewMode: viewMode || 'flat',
      uniqueKeyColumns: req.body.uniqueKeyColumns || [],
      createdBy: req.user!.id,
    }).returning();

    res.status(201).json(exercise);
  } catch (error) {
    console.error('Create exercise error:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});
```

- [ ] **Step 3: Add column management endpoints**

```typescript
// POST /api/v1/exercises/:id/columns -- add columns (source or classification)
router.post('/:id/columns', requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { columns } = req.body; // Array of column definitions

  const inserted = [];
  for (const col of columns) {
    const [c] = await db.insert(exerciseColumns).values({
      exerciseId: id,
      ...col,
    }).returning();
    inserted.push(c);
  }

  res.status(201).json({ columns: inserted });
});

// PUT /api/v1/exercises/:id/columns/:colId
router.put('/:id/columns/:colId', requireRole('admin'), async (req: Request, res: Response) => {
  const { colId } = req.params;
  const updates = req.body;

  const [updated] = await db.update(exerciseColumns)
    .set(updates)
    .where(eq(exerciseColumns.id, colId))
    .returning();

  res.json(updated);
});

// DELETE /api/v1/exercises/:id/columns/:colId
router.delete('/:id/columns/:colId', requireRole('admin'), async (req: Request, res: Response) => {
  const { colId } = req.params;
  await db.delete(exerciseColumns).where(eq(exerciseColumns.id, colId));
  res.status(204).send();
});
```

- [ ] **Step 4: Add user assignment endpoints**

```typescript
// GET /api/v1/exercises/:id/assignments
router.get('/:id/assignments', async (req: Request, res: Response) => {
  const { id } = req.params;
  const assignments = await db
    .select({
      id: userExerciseAssignments.id,
      userId: userExerciseAssignments.userId,
      role: userExerciseAssignments.role,
      userName: users.name,
      userEmail: users.email,
    })
    .from(userExerciseAssignments)
    .innerJoin(users, eq(userExerciseAssignments.userId, users.id))
    .where(eq(userExerciseAssignments.exerciseId, id));

  res.json({ assignments });
});

// POST /api/v1/exercises/:id/assignments
router.post('/:id/assignments', requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, role } = req.body;

  const [assignment] = await db.insert(userExerciseAssignments).values({
    userId,
    exerciseId: id,
    role: role || 'editor',
    assignedBy: req.user!.id,
  }).returning();

  res.status(201).json(assignment);
});

// DELETE /api/v1/exercises/:id/assignments/:userId
router.delete('/:id/assignments/:assignmentId', requireRole('admin'), async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  await db.delete(userExerciseAssignments)
    .where(eq(userExerciseAssignments.id, assignmentId));
  res.status(204).send();
});
```

- [ ] **Step 5: Add BigQuery source config endpoint**

```typescript
// POST /api/v1/exercises/:id/source-config
router.post('/:id/source-config', requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { gcpProject, dataset, tableOrQuery, queryType, credentialId, refreshSchedule } = req.body;

  // Check if source config already exists
  const existing = await db.select().from(bigquerySources)
    .where(eq(bigquerySources.exerciseId, id));

  if (existing.length > 0) {
    const [updated] = await db.update(bigquerySources)
      .set({ gcpProject, dataset, tableOrQuery, queryType, credentialId, refreshSchedule, updatedAt: new Date() })
      .where(eq(bigquerySources.exerciseId, id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(bigquerySources).values({
      exerciseId: id,
      gcpProject, dataset, tableOrQuery, queryType, credentialId, refreshSchedule,
    }).returning();
    res.status(201).json(created);
  }
});
```

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/exercises.ts
git commit -m "feat: add publish, column CRUD, assignment, and source config endpoints"
```

---

### Task 15: Client API Functions for Wizard

**Files:**
- Modify: `client/src/api/exercises.ts`

- [ ] **Step 1: Add wizard-related API functions**

```typescript
// Add to client/src/api/exercises.ts

export async function createExercise(payload: {
  name: string;
  description?: string;
  viewMode?: string;
}): Promise<{ id: string }> {
  const response = await apiClient.post('/exercises', payload);
  return response.data;
}

export async function updateExercise(id: string, payload: Record<string, unknown>): Promise<void> {
  await apiClient.put(`/exercises/${id}`, payload);
}

export async function publishExercise(id: string): Promise<{ status: string; syncResult: unknown }> {
  const response = await apiClient.post(`/exercises/${id}/publish`);
  return response.data;
}

export async function saveSourceConfig(exerciseId: string, config: {
  gcpProject: string;
  dataset: string;
  tableOrQuery: string;
  queryType: string;
  credentialId: string;
  refreshSchedule: string | null;
}): Promise<void> {
  await apiClient.post(`/exercises/${exerciseId}/source-config`, config);
}

export async function saveExerciseColumns(exerciseId: string, columns: unknown[]): Promise<void> {
  await apiClient.post(`/exercises/${exerciseId}/columns`, { columns });
}

export async function addUserAssignment(exerciseId: string, userId: string, role: string): Promise<void> {
  await apiClient.post(`/exercises/${exerciseId}/assignments`, { userId, role });
}

export async function removeUserAssignment(exerciseId: string, assignmentId: string): Promise<void> {
  await apiClient.delete(`/exercises/${exerciseId}/assignments/${assignmentId}`);
}

export async function fetchAssignments(exerciseId: string): Promise<unknown[]> {
  const response = await apiClient.get(`/exercises/${exerciseId}/assignments`);
  return response.data.assignments;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api/exercises.ts
git commit -m "feat: add client API functions for exercise wizard"
```
