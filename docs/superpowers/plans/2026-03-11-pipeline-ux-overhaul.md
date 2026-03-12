# Pipeline UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw JSON pipeline config editor with typed forms, add lifecycle management, live execution feedback, and save-time validation.

**Architecture:** Builds on the existing React Flow + Zustand pipeline builder. New per-node-type form components replace the JSON textarea. The Zustand store gains run-status tracking fields. A 2-second polling loop provides live execution feedback on canvas nodes. Save-time validation runs client-side before persisting.

**Tech Stack:** React 19, TypeScript, Zustand 5, React Flow (@xyflow/react), react-hot-toast, cronstrue, Tailwind CSS 4, Express 5, Drizzle ORM

**Spec:** `docs/superpowers/specs/2026-03-11-pipeline-ux-overhaul-design.md`

---

## Chunk 1: Foundation — Store, API, Server Endpoint

### Task 1: Install cronstrue dependency

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Install cronstrue**

```bash
cd client && npm install cronstrue
```

- [ ] **Step 2: Verify install**

```bash
cd client && node -e "import('cronstrue').then(c => console.log(c.default.toString('0 2 * * *')))"
```

Expected: `At 02:00 AM`

- [ ] **Step 3: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "chore: add cronstrue dependency for cron expression preview"
```

---

### Task 2: Add PATCH status endpoint to server

**Files:**
- Modify: `server/src/routes/pipelines.ts:37` (after the PUT route)
- Test: `server/src/__tests__/pipeline-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/__tests__/pipeline-status.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock db and auth
vi.mock('../db/connection', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  },
}));

vi.mock('../middleware/auth', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'u1', orgId: 'org1', role: 'admin' };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../services/pipeline-executor', () => ({
  executePipeline: vi.fn(),
}));

describe('PATCH /pipelines/:id/status', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    const { pipelineRouter } = await import('../routes/pipelines');
    app.use('/pipelines', pipelineRouter);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app).patch('/pipelines/p1/status').send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('updates pipeline status', async () => {
    const { db } = await import('../db/connection');
    (db.returning as any).mockResolvedValueOnce([{ id: 'p1', status: 'active' }]);

    const res = await request(app).patch('/pipelines/p1/status').send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx vitest run src/__tests__/pipeline-status.test.ts
```

Expected: FAIL — no PATCH route defined

- [ ] **Step 3: Add PATCH route to server**

In `server/src/routes/pipelines.ts`, add after the `router.put('/:id', ...)` block (after line 37):

```typescript
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  const validStatuses = ['draft', 'active', 'paused'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }
  const [updated] = await db.update(pipelines).set({ status, updatedAt: new Date() }).where(eq(pipelines.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: 'Pipeline not found' }); return; }
  res.json(updated);
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx vitest run src/__tests__/pipeline-status.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/pipelines.ts server/src/__tests__/pipeline-status.test.ts
git commit -m "feat: add PATCH endpoint for pipeline status updates"
```

---

### Task 3: Add updatePipelineStatus to client API

**Files:**
- Modify: `client/src/api/pipelines.ts:27` (after deletePipeline)

- [ ] **Step 1: Add the function**

In `client/src/api/pipelines.ts`, add after the `deletePipeline` function:

```typescript
export async function updatePipelineStatus(id: string, status: 'draft' | 'active' | 'paused'): Promise<PipelineDetail> {
  const response = await apiClient.patch<PipelineDetail>(`/pipelines/${id}/status`, { status });
  return response.data;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api/pipelines.ts
git commit -m "feat: add updatePipelineStatus API client function"
```

---

### Task 4: Extend pipelineStore with status and run tracking

**Files:**
- Modify: `client/src/stores/pipelineStore.ts`

- [ ] **Step 1: Add new state fields and actions**

Add these imports at the top of `client/src/stores/pipelineStore.ts`:

```typescript
import type { PipelineNode, PipelineEdge, PipelineNodeConfig, PipelineStatus, NodeRunStatus } from '@mapforge/shared';
```

Update the `PipelineState` interface — add after `triggerConfig`:

```typescript
  status: PipelineStatus;
  activeRunId: string | null;
  nodeRunStatuses: Record<string, NodeRunStatus>;
  nodeRunDetails: Record<string, { inputRowCount: number | null; outputRowCount: number | null; startedAt: string | null; completedAt: string | null; errorMessage: string | null }>;
  validationErrors: Array<{ nodeId?: string; message: string }>;

  setStatus: (status: PipelineStatus) => void;
  setActiveRunId: (runId: string | null) => void;
  setNodeRunStatuses: (statuses: Record<string, NodeRunStatus>) => void;
  setNodeRunDetails: (details: Record<string, { inputRowCount: number | null; outputRowCount: number | null; startedAt: string | null; completedAt: string | null; errorMessage: string | null }>) => void;
  setValidationErrors: (errors: Array<{ nodeId?: string; message: string }>) => void;
  clearRunStatus: () => void;
```

Update `initialState` — add:

```typescript
  status: 'draft' as PipelineStatus,
  activeRunId: null as string | null,
  nodeRunStatuses: {} as Record<string, NodeRunStatus>,
  nodeRunDetails: {} as Record<string, { inputRowCount: number | null; outputRowCount: number | null; startedAt: string | null; completedAt: string | null; errorMessage: string | null }>,
  validationErrors: [] as Array<{ nodeId?: string; message: string }>,
```

Add these actions in the `create<PipelineState>` body:

```typescript
  setStatus: (status) => set({ status }),
  setActiveRunId: (runId) => set({ activeRunId: runId }),
  setNodeRunStatuses: (statuses) => set({ nodeRunStatuses: statuses }),
  setNodeRunDetails: (details) => set({ nodeRunDetails: details }),
  setValidationErrors: (errors) => set({ validationErrors: errors }),
  clearRunStatus: () => set({ activeRunId: null, nodeRunStatuses: {}, nodeRunDetails: {} }),

  // Override existing mutation actions to clear run status on edit
  // Wrap the existing setPipelineName, addNode, removeNode, updateNodeConfig, addEdge, removeEdge
  // by adding `nodeRunStatuses: {}, nodeRunDetails: {}` to their set() calls.
  // This ensures run status clears when the user begins editing.
```

Update `loadPipeline` to also set `status`:

```typescript
  loadPipeline: (data) => set({
    pipelineId: data.id, pipelineName: data.name, nodes: data.nodes, edges: data.edges,
    triggerType: data.triggerType, triggerConfig: data.triggerConfig, status: data.status ?? 'draft',
    isDirty: false, selectedNodeId: null, activeRunId: null, nodeRunStatuses: {}, nodeRunDetails: {}, validationErrors: [],
  }),
```

Update `loadPipeline`'s parameter type to include `status?: PipelineStatus`.

Update `reset` to use `initialState` (already does, so new fields are covered).

- [ ] **Step 2: Verify typecheck passes**

Note: `PipelineBuilderPage.tsx` will be updated in Task 15 to pass `status` on load. No change needed here.

```bash
cd client && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/stores/pipelineStore.ts
git commit -m "feat: extend pipeline store with status and run tracking state"
```

---

## Chunk 2: Node Configuration Forms

### Task 5: Create BigQuerySourceForm

**Files:**
- Create: `client/src/components/pipeline/config/BigQuerySourceForm.tsx`

- [ ] **Step 1: Create the form component**

```typescript
import { useState, useEffect } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { fetchCredentials } from '@/api/credentials';
import type { BigQuerySourceNodeConfig, CredentialMetadata } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: BigQuerySourceNodeConfig;
}

export function BigQuerySourceForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);
  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);

  useEffect(() => {
    fetchCredentials().then(setCredentials).catch(console.error);
  }, []);

  const update = (partial: Partial<BigQuerySourceNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...partial });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-forge-400 mb-1">Credential</label>
        <select
          value={config.credentialId || ''}
          onChange={(e) => update({ credentialId: e.target.value })}
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        >
          <option value="">Select credential...</option>
          {credentials.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">GCP Project</label>
        <input
          type="text"
          value={config.gcpProject || ''}
          onChange={(e) => update({ gcpProject: e.target.value })}
          placeholder="my-gcp-project"
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        />
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Dataset</label>
        <input
          type="text"
          value={config.dataset || ''}
          onChange={(e) => update({ dataset: e.target.value })}
          placeholder="my_dataset"
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        />
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Query Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => update({ queryType: 'table' })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.queryType === 'table' || !config.queryType
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                : 'bg-forge-800 border-forge-600 text-forge-400'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => update({ queryType: 'query' })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.queryType === 'query'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                : 'bg-forge-800 border-forge-600 text-forge-400'
            }`}
          >
            Custom SQL
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">
          {config.queryType === 'query' ? 'SQL Query' : 'Table Name'}
        </label>
        {config.queryType === 'query' ? (
          <textarea
            value={config.tableOrQuery || ''}
            onChange={(e) => update({ tableOrQuery: e.target.value })}
            placeholder="SELECT * FROM ..."
            rows={4}
            className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100 font-mono resize-none"
          />
        ) : (
          <input
            type="text"
            value={config.tableOrQuery || ''}
            onChange={(e) => update({ tableOrQuery: e.target.value })}
            placeholder="my_table"
            className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/BigQuerySourceForm.tsx
git commit -m "feat: add BigQuery source config form component"
```

---

### Task 6: Create BigQueryDestinationForm

**Files:**
- Create: `client/src/components/pipeline/config/BigQueryDestinationForm.tsx`

- [ ] **Step 1: Create the form component**

```typescript
import { useState, useEffect } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { fetchCredentials } from '@/api/credentials';
import type { BigQueryDestNodeConfig, CredentialMetadata } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: BigQueryDestNodeConfig;
}

export function BigQueryDestinationForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);
  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);

  useEffect(() => {
    fetchCredentials().then(setCredentials).catch(console.error);
  }, []);

  const update = (partial: Partial<BigQueryDestNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...partial });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-forge-400 mb-1">Credential</label>
        <select
          value={config.credentialId || ''}
          onChange={(e) => update({ credentialId: e.target.value })}
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        >
          <option value="">Select credential...</option>
          {credentials.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">GCP Project</label>
        <input
          type="text"
          value={config.gcpProject || ''}
          onChange={(e) => update({ gcpProject: e.target.value })}
          placeholder="my-gcp-project"
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        />
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Dataset</label>
        <input
          type="text"
          value={config.dataset || ''}
          onChange={(e) => update({ dataset: e.target.value })}
          placeholder="my_dataset"
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        />
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Table Name</label>
        <input
          type="text"
          value={config.tableName || ''}
          onChange={(e) => update({ tableName: e.target.value })}
          placeholder="destination_table"
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        />
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Write Mode</label>
        <div className="flex gap-1">
          {(['merge', 'append', 'overwrite'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => update({ writeMode: mode })}
              className={`flex-1 px-2 py-1.5 rounded text-xs border ${
                config.writeMode === mode
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-forge-800 border-forge-600 text-forge-400'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {config.writeMode === 'merge' && (
        <div>
          <label className="block text-xs text-forge-400 mb-1">Merge Key Columns</label>
          <input
            type="text"
            value={(config.mergeKeyColumns || []).join(', ')}
            onChange={(e) => update({ mergeKeyColumns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="col1, col2"
            className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
          />
          <p className="text-[10px] text-forge-500 mt-0.5">Comma-separated column names used as merge keys</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/BigQueryDestinationForm.tsx
git commit -m "feat: add BigQuery destination config form component"
```

---

### Task 7: Create EnrichmentExerciseForm

**Files:**
- Create: `client/src/components/pipeline/config/EnrichmentExerciseForm.tsx`

- [ ] **Step 1: Create the form component**

```typescript
import { useState, useEffect } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { fetchMyExercises } from '@/api/exercises';
import type { ExerciseNodeConfig, ExerciseListItem } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: ExerciseNodeConfig;
}

export function EnrichmentExerciseForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);

  useEffect(() => {
    fetchMyExercises().then(setExercises).catch(console.error);
  }, []);

  const update = (partial: Partial<ExerciseNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...partial });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-forge-400 mb-1">Exercise</label>
        <select
          value={config.exerciseId || ''}
          onChange={(e) => update({ exerciseId: e.target.value })}
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        >
          <option value="">Select exercise...</option>
          {exercises.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => update({ mode: 'pass_through', completionThreshold: undefined })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.mode === 'pass_through' || !config.mode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-forge-800 border-forge-600 text-forge-400'
            }`}
          >
            Pass Through
          </button>
          <button
            onClick={() => update({ mode: 'wait_for_completion', completionThreshold: config.completionThreshold ?? 100 })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.mode === 'wait_for_completion'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-forge-800 border-forge-600 text-forge-400'
            }`}
          >
            Wait for Completion
          </button>
        </div>
      </div>
      {config.mode === 'wait_for_completion' && (
        <div>
          <label className="block text-xs text-forge-400 mb-1">
            Completion Threshold: {config.completionThreshold ?? 100}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={config.completionThreshold ?? 100}
            onChange={(e) => update({ completionThreshold: Number(e.target.value) })}
            className="w-full accent-amber-500"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/EnrichmentExerciseForm.tsx
git commit -m "feat: add enrichment exercise config form component"
```

---

### Task 8: Create ValidationGateForm

**Files:**
- Create: `client/src/components/pipeline/config/ValidationGateForm.tsx`

- [ ] **Step 1: Create the form component**

```typescript
import { usePipelineStore } from '@/stores/pipelineStore';
import type { ValidationGateNodeConfig } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: ValidationGateNodeConfig;
}

const RULE_TYPES = [
  { type: 'all_required_filled' as const, label: 'All required fields filled' },
  { type: 'no_errors' as const, label: 'No validation errors' },
  { type: 'min_completion' as const, label: 'Minimum completion %' },
];

export function ValidationGateForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);

  const rules = config.rules || [];
  const hasRule = (type: string) => rules.some(r => r.type === type);
  const getThreshold = () => rules.find(r => r.type === 'min_completion')?.threshold ?? 80;

  const toggleRule = (type: typeof RULE_TYPES[number]['type']) => {
    let newRules;
    if (hasRule(type)) {
      newRules = rules.filter(r => r.type !== type);
    } else {
      const rule: { type: typeof type; threshold?: number } = { type };
      if (type === 'min_completion') rule.threshold = 80;
      newRules = [...rules, rule];
    }
    updateNodeConfig(nodeId, { ...config, rules: newRules });
  };

  const updateThreshold = (threshold: number) => {
    const newRules = rules.map(r =>
      r.type === 'min_completion' ? { ...r, threshold } : r
    );
    updateNodeConfig(nodeId, { ...config, rules: newRules });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-forge-400 mb-2">Validation Rules</label>
        <div className="space-y-2">
          {RULE_TYPES.map(({ type, label }) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasRule(type)}
                onChange={() => toggleRule(type)}
                className="rounded border-forge-600 bg-forge-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-forge-200">{label}</span>
            </label>
          ))}
        </div>
      </div>
      {hasRule('min_completion') && (
        <div>
          <label className="block text-xs text-forge-400 mb-1">
            Min Completion: {getThreshold()}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={getThreshold()}
            onChange={(e) => updateThreshold(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
      )}
      <div>
        <label className="block text-xs text-forge-400 mb-1">On Failure</label>
        <div className="flex gap-2">
          <button
            onClick={() => updateNodeConfig(nodeId, { ...config, failAction: 'stop' })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.failAction === 'stop' || !config.failAction
                ? 'bg-red-500/20 border-red-500/50 text-red-300'
                : 'bg-forge-800 border-forge-600 text-forge-400'
            }`}
          >
            Stop Pipeline
          </button>
          <button
            onClick={() => updateNodeConfig(nodeId, { ...config, failAction: 'warn_and_continue' })}
            className={`flex-1 px-2 py-1.5 rounded text-xs border ${
              config.failAction === 'warn_and_continue'
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                : 'bg-forge-800 border-forge-600 text-forge-400'
            }`}
          >
            Warn & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/ValidationGateForm.tsx
git commit -m "feat: add validation gate config form component"
```

---

### Task 9: Create TransformForm

**Files:**
- Create: `client/src/components/pipeline/config/TransformForm.tsx`

- [ ] **Step 1: Create the form component**

```typescript
import { usePipelineStore } from '@/stores/pipelineStore';
import type { TransformNodeConfig } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: TransformNodeConfig;
}

const SUPPORTED_TYPES = ['filter', 'map'] as const;
const UNSUPPORTED_TYPES = ['aggregate', 'pivot', 'unpivot'];

export function TransformForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);

  // Fallback to read-only JSON for unsupported transform types
  if (UNSUPPORTED_TYPES.includes(config.transformType)) {
    return (
      <div className="space-y-3">
        <div className="px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-300">
          Transform type "{config.transformType}" is not yet supported for visual editing.
        </div>
        <pre className="text-xs text-forge-300 bg-forge-800 p-2 rounded overflow-auto max-h-48 font-mono">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    );
  }

  const update = (partial: Partial<TransformNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...partial });
  };

  const filterCondition = (config.config as { condition?: string })?.condition || '';
  const mapColumns = (config.config as { columns?: Record<string, string> })?.columns || {};

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-forge-400 mb-1">Transform Type</label>
        <div className="flex gap-2">
          {SUPPORTED_TYPES.map(type => (
            <button
              key={type}
              onClick={() => update({ transformType: type, config: {} })}
              className={`flex-1 px-2 py-1.5 rounded text-sm border ${
                config.transformType === type
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-forge-800 border-forge-600 text-forge-400'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {config.transformType === 'filter' && (
        <div>
          <label className="block text-xs text-forge-400 mb-1">Filter Condition</label>
          <input
            type="text"
            value={filterCondition}
            onChange={(e) => update({ config: { condition: e.target.value } })}
            placeholder="status = 'active'"
            className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100 font-mono"
          />
          <p className="text-[10px] text-forge-500 mt-0.5">SQL-like WHERE condition to filter records</p>
        </div>
      )}

      {config.transformType === 'map' && (
        <div>
          <label className="block text-xs text-forge-400 mb-1">Column Mapping</label>
          <p className="text-[10px] text-forge-500 mb-1">Rename columns: source_name → target_name</p>
          {Object.entries(mapColumns).map(([from, to], i) => (
            <div key={i} className="flex gap-1 mb-1">
              <input
                type="text"
                value={from}
                readOnly
                className="flex-1 px-2 py-1 bg-forge-800 border border-forge-600 rounded text-xs text-forge-300 font-mono"
              />
              <span className="text-forge-500 text-xs self-center">→</span>
              <input
                type="text"
                value={to}
                onChange={(e) => {
                  const newCols = { ...mapColumns, [from]: e.target.value };
                  update({ config: { columns: newCols } });
                }}
                className="flex-1 px-2 py-1 bg-forge-800 border border-forge-600 rounded text-xs text-forge-100 font-mono"
              />
              <button
                onClick={() => {
                  const newCols = { ...mapColumns };
                  delete newCols[from];
                  update({ config: { columns: newCols } });
                }}
                className="text-red-400 hover:text-red-300 text-xs px-1"
              >
                x
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const key = `column_${Object.keys(mapColumns).length + 1}`;
              update({ config: { columns: { ...mapColumns, [key]: key } } });
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 mt-1"
          >
            + Add column mapping
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/TransformForm.tsx
git commit -m "feat: add transform config form component with filter and map support"
```

---

### Task 10: Create NotificationForm

**Files:**
- Create: `client/src/components/pipeline/config/NotificationForm.tsx`

- [ ] **Step 1: Create the form component**

```typescript
import { usePipelineStore } from '@/stores/pipelineStore';
import type { NotificationNodeConfig } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: NotificationNodeConfig;
}

export function NotificationForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);

  const update = (partial: Partial<NotificationNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...partial });
  };

  const toggleChannel = (channel: 'email' | 'in_app') => {
    const channels = config.channels || [];
    const newChannels = channels.includes(channel)
      ? channels.filter(c => c !== channel)
      : [...channels, channel];
    update({ channels: newChannels });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-forge-400 mb-2">Channels</label>
        <div className="space-y-1">
          {(['email', 'in_app'] as const).map(channel => (
            <label key={channel} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(config.channels || []).includes(channel)}
                onChange={() => toggleChannel(channel)}
                className="rounded border-forge-600 bg-forge-800 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-sm text-forge-200">
                {channel === 'email' ? 'Email' : 'In-App'}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Recipient Type</label>
        <select
          value={config.recipientType || 'admin'}
          onChange={(e) => update({ recipientType: e.target.value as NotificationNodeConfig['recipientType'] })}
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        >
          <option value="admin">Admin</option>
          <option value="assigned_users">Assigned Users</option>
          <option value="specific_users">Specific Users</option>
        </select>
      </div>
      {config.recipientType === 'specific_users' && (
        <div>
          <label className="block text-xs text-forge-400 mb-1">User IDs</label>
          <input
            type="text"
            value={(config.specificUserIds || []).join(', ')}
            onChange={(e) => update({ specificUserIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="user-id-1, user-id-2"
            className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
          />
          <p className="text-[10px] text-forge-500 mt-0.5">Comma-separated user IDs</p>
        </div>
      )}
      <div>
        <label className="block text-xs text-forge-400 mb-1">Message Template</label>
        <textarea
          value={config.messageTemplate || ''}
          onChange={(e) => update({ messageTemplate: e.target.value })}
          placeholder="Pipeline {{pipelineName}} completed with {{rowCount}} rows processed."
          rows={3}
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100 resize-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/NotificationForm.tsx
git commit -m "feat: add notification config form component"
```

---

### Task 11: Rewrite NodeConfigDrawer with form routing and tabs

**Files:**
- Modify: `client/src/components/pipeline/NodeConfigDrawer.tsx`

- [ ] **Step 1: Rewrite the drawer**

Replace the entire contents of `client/src/components/pipeline/NodeConfigDrawer.tsx`:

```typescript
import { useState } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { PipelineNodeConfig, NodeRunStatus } from '@mapforge/shared';
import { BigQuerySourceForm } from './config/BigQuerySourceForm';
import { BigQueryDestinationForm } from './config/BigQueryDestinationForm';
import { EnrichmentExerciseForm } from './config/EnrichmentExerciseForm';
import { ValidationGateForm } from './config/ValidationGateForm';
import { TransformForm } from './config/TransformForm';
import { NotificationForm } from './config/NotificationForm';

function NodeConfigForm({ nodeId, nodeType, config }: { nodeId: string; nodeType: string; config: PipelineNodeConfig }) {
  switch (nodeType) {
    case 'bigquery_source':
      return <BigQuerySourceForm nodeId={nodeId} config={config as any} />;
    case 'bigquery_destination':
      return <BigQueryDestinationForm nodeId={nodeId} config={config as any} />;
    case 'enrichment_exercise':
      return <EnrichmentExerciseForm nodeId={nodeId} config={config as any} />;
    case 'validation_gate':
      return <ValidationGateForm nodeId={nodeId} config={config as any} />;
    case 'transform':
      return <TransformForm nodeId={nodeId} config={config as any} />;
    case 'notification':
      return <NotificationForm nodeId={nodeId} config={config as any} />;
    default:
      return (
        <div className="space-y-2">
          <div className="px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-300">
            No visual editor for node type "{nodeType}".
          </div>
          <pre className="text-xs text-forge-300 bg-forge-800 p-2 rounded overflow-auto max-h-48 font-mono">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      );
  }
}

function RunStatusBadge({ status }: { status: NodeRunStatus }) {
  const styles: Record<NodeRunStatus, string> = {
    pending: 'bg-forge-600 text-forge-300',
    running: 'bg-amber-500/20 text-amber-300',
    success: 'bg-emerald-500/20 text-emerald-300',
    failed: 'bg-red-500/20 text-red-300',
    skipped: 'bg-forge-700 text-forge-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

export function NodeConfigDrawer() {
  const { nodes, selectedNodeId, removeNode, selectNode, updateNodeConfig,
    nodeRunStatuses, nodeRunDetails, validationErrors } = usePipelineStore();
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const [activeTab, setActiveTab] = useState<'config' | 'run'>('config');

  if (!selectedNode) return null;

  const runStatus = selectedNodeId ? nodeRunStatuses[selectedNodeId] : undefined;
  const runDetail = selectedNodeId ? nodeRunDetails[selectedNodeId] : undefined;
  const nodeErrors = validationErrors.filter(e => e.nodeId === selectedNodeId);

  const handleLabelChange = (label: string) => {
    const currentConfig = selectedNode.config;
    // Update label by updating the full node via store
    // We need to update node label — add updateNodeLabel or use updateNodeConfig workaround
    // For now, update via the nodes array
    usePipelineStore.getState().setNodes(
      nodes.map(n => n.id === selectedNode.id ? { ...n, label } : n)
    );
  };

  return (
    <div className="w-80 bg-forge-900 border-l border-forge-700 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-forge-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-forge-500 uppercase tracking-wider">{selectedNode.type.replace(/_/g, ' ')}</span>
          <button onClick={() => selectNode(null)} className="text-forge-400 hover:text-forge-200 text-xs">Close</button>
        </div>
        <input
          type="text"
          value={selectedNode.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="w-full px-2 py-1 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100 font-medium"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-forge-700">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${
            activeTab === 'config'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-forge-400 hover:text-forge-200'
          }`}
        >
          Config
        </button>
        <button
          onClick={() => setActiveTab('run')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${
            activeTab === 'run'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-forge-400 hover:text-forge-200'
          }`}
        >
          Last Run
          {runStatus && <RunStatusBadge status={runStatus} />}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'config' ? (
          <div className="space-y-4">
            {nodeErrors.length > 0 && (
              <div className="px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded">
                {nodeErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-300">{err.message}</p>
                ))}
              </div>
            )}
            <NodeConfigForm nodeId={selectedNode.id} nodeType={selectedNode.type} config={selectedNode.config} />
            <button
              onClick={() => removeNode(selectedNode.id)}
              className="w-full px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm hover:bg-red-500/30"
            >
              Delete Node
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {runStatus ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-forge-400">Status</span>
                  <RunStatusBadge status={runStatus} />
                </div>
                {runDetail && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-forge-400">Input Rows</span>
                      <span className="text-sm text-forge-200">{runDetail.inputRowCount ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-forge-400">Output Rows</span>
                      <span className="text-sm text-forge-200">{runDetail.outputRowCount ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-forge-400">Duration</span>
                      <span className="text-sm text-forge-200">
                        {runDetail.startedAt && runDetail.completedAt
                          ? `${((new Date(runDetail.completedAt).getTime() - new Date(runDetail.startedAt).getTime()) / 1000).toFixed(1)}s`
                          : runDetail.startedAt ? 'Running...' : '-'}
                      </span>
                    </div>
                    {runDetail.errorMessage && (
                      <div className="px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded">
                        <p className="text-xs text-red-300">{runDetail.errorMessage}</p>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-forge-500">No run data available. Run the pipeline to see execution results.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pipeline/NodeConfigDrawer.tsx
git commit -m "feat: replace JSON editor with typed config forms and run details tabs"
```

---

## Chunk 3: Toolbar, Trigger Config & Lifecycle

### Task 12: Create TriggerConfigPanel

**Files:**
- Create: `client/src/components/pipeline/TriggerConfigPanel.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { usePipelineStore } from '@/stores/pipelineStore';
import cronstrue from 'cronstrue';

const CRON_PRESETS = [
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily at 2 AM', value: '0 2 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Weekly (Monday)', value: '0 2 * * 1' },
  { label: 'Custom', value: 'custom' },
];

function getCronDescription(expression: string): string {
  try {
    return cronstrue.toString(expression);
  } catch {
    return 'Invalid cron expression';
  }
}

export function TriggerConfigPanel() {
  const { triggerType, triggerConfig, setTriggerType, setTriggerConfig, pipelineId } = usePipelineStore();

  const cronExpression = (triggerConfig as { cronExpression?: string }).cronExpression || '';
  const isPreset = CRON_PRESETS.some(p => p.value === cronExpression);

  return (
    <div className="flex items-center gap-2">
      <select
        value={triggerType}
        onChange={(e) => {
          setTriggerType(e.target.value);
          if (e.target.value === 'manual') setTriggerConfig({});
        }}
        className="px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
      >
        <option value="manual">Manual</option>
        <option value="cron">Scheduled</option>
        <option value="api">API</option>
      </select>

      {triggerType === 'cron' && (
        <div className="flex items-center gap-2">
          <select
            value={isPreset ? cronExpression : 'custom'}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                setTriggerConfig({ cronExpression: e.target.value });
              }
            }}
            className="px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
          >
            {CRON_PRESETS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {(!isPreset || cronExpression === '') && (
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setTriggerConfig({ cronExpression: e.target.value })}
              placeholder="0 * * * *"
              className="px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100 font-mono w-32"
            />
          )}
          {cronExpression && (
            <span className="text-[10px] text-forge-400 max-w-40 truncate" title={getCronDescription(cronExpression)}>
              {getCronDescription(cronExpression)}
            </span>
          )}
        </div>
      )}

      {triggerType === 'api' && pipelineId && (
        <div className="flex items-center gap-2">
          <code className="text-[10px] text-forge-400 bg-forge-800 px-2 py-1 rounded font-mono">
            /api/v1/pipelines/{pipelineId}/run
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/v1/pipelines/${pipelineId}/run`)}
            className="text-xs text-forge-400 hover:text-forge-200 px-1"
            title="Copy URL"
          >
            Copy
          </button>
          {(triggerConfig as { webhookSecret?: string }).webhookSecret && (
            <span className="text-[10px] text-forge-500">
              Secret: <code className="bg-forge-800 px-1 rounded">{(triggerConfig as { webhookSecret?: string }).webhookSecret}</code>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/TriggerConfigPanel.tsx
git commit -m "feat: add trigger config panel with cron presets and preview"
```

---

### Task 13: Rewrite PipelineToolbar with lifecycle controls

**Files:**
- Modify: `client/src/components/pipeline/PipelineToolbar.tsx`

- [ ] **Step 1: Rewrite the toolbar**

Replace the entire contents of `client/src/components/pipeline/PipelineToolbar.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipelineStore } from '@/stores/pipelineStore';
import { createPipeline, updatePipeline, triggerPipelineRun, deletePipeline, updatePipelineStatus } from '@/api/pipelines';
import { TriggerConfigPanel } from './TriggerConfigPanel';
import toast from 'react-hot-toast';
import type { PipelineStatus } from '@mapforge/shared';

export function PipelineToolbar() {
  const store = usePipelineStore();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRunConfirm, setShowRunConfirm] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (store.pipelineId) {
        await updatePipeline(store.pipelineId, {
          name: store.pipelineName, nodes: store.nodes, edges: store.edges,
          triggerType: store.triggerType as any, triggerConfig: store.triggerConfig as any,
        });
        toast.success('Pipeline saved');
      } else {
        const result = await createPipeline({
          name: store.pipelineName, nodes: store.nodes, edges: store.edges,
          triggerType: store.triggerType as any, triggerConfig: store.triggerConfig as any,
        });
        store.setPipelineId(result.id);
        toast.success('Pipeline created');
      }
      store.markClean();
    } catch (err) {
      toast.error('Failed to save pipeline');
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!store.pipelineId) return;
    setShowRunConfirm(false);
    try {
      const { runId } = await triggerPipelineRun(store.pipelineId);
      store.setActiveRunId(runId);
      toast.success('Pipeline run started');
    } catch (err) {
      toast.error('Failed to start pipeline run');
      console.error('Run failed:', err);
    }
  };

  const handleDelete = async () => {
    if (!store.pipelineId) return;
    setShowDeleteConfirm(false);
    try {
      await deletePipeline(store.pipelineId);
      toast.success('Pipeline deleted');
      navigate('/pipelines');
    } catch (err) {
      toast.error('Failed to delete pipeline');
      console.error('Delete failed:', err);
    }
  };

  const handleStatusToggle = async () => {
    if (!store.pipelineId) return;
    const newStatus: PipelineStatus = store.status === 'active' ? 'paused' : 'active';
    try {
      await updatePipelineStatus(store.pipelineId, newStatus);
      store.setStatus(newStatus);
      toast.success(`Pipeline ${newStatus === 'active' ? 'activated' : 'paused'}`);
    } catch (err) {
      toast.error('Failed to update pipeline status');
      console.error('Status update failed:', err);
    }
  };

  const statusColors: Record<PipelineStatus, string> = {
    draft: 'bg-forge-600 text-forge-300',
    active: 'bg-emerald-500/20 text-emerald-300',
    paused: 'bg-yellow-500/20 text-yellow-300',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-forge-900 border-b border-forge-700 relative">
      <input
        type="text"
        value={store.pipelineName}
        onChange={(e) => store.setPipelineName(e.target.value)}
        className="px-3 py-1.5 bg-forge-800 border border-forge-600 rounded text-forge-100 text-sm w-48"
      />
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${statusColors[store.status]}`}>
        {store.status}
      </span>

      <div className="border-l border-forge-700 h-6 mx-1" />

      <TriggerConfigPanel />

      <div className="flex-1" />

      {store.pipelineId && (
        <button
          onClick={handleStatusToggle}
          className="px-3 py-1.5 bg-forge-800 border border-forge-600 text-forge-200 rounded text-sm hover:bg-forge-700"
        >
          {store.status === 'active' ? 'Pause' : 'Activate'}
        </button>
      )}
      <button
        onClick={handleSave}
        disabled={!store.isDirty || saving}
        className="px-3 py-1.5 bg-amber-500 text-forge-900 rounded text-sm font-medium hover:bg-amber-400 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button
        onClick={() => setShowRunConfirm(true)}
        disabled={!store.pipelineId}
        className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        Run
      </button>
      {store.pipelineId && (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm hover:bg-red-500/30"
        >
          Delete
        </button>
      )}

      {/* Run confirmation */}
      {showRunConfirm && (
        <div className="absolute top-full right-4 mt-1 z-50 bg-forge-800 border border-forge-600 rounded-lg shadow-xl p-4 w-64">
          <p className="text-sm text-forge-200 mb-3">Run this pipeline now?</p>
          <div className="flex gap-2">
            <button onClick={handleRun} className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-500">
              Confirm
            </button>
            <button onClick={() => setShowRunConfirm(false)} className="flex-1 px-3 py-1.5 bg-forge-700 text-forge-300 rounded text-sm hover:bg-forge-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="absolute top-full right-4 mt-1 z-50 bg-forge-800 border border-forge-600 rounded-lg shadow-xl p-4 w-64">
          <p className="text-sm text-forge-200 mb-3">Delete this pipeline? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-500">
              Delete
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-3 py-1.5 bg-forge-700 text-forge-300 rounded text-sm hover:bg-forge-600">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pipeline/PipelineToolbar.tsx
git commit -m "feat: rewrite pipeline toolbar with lifecycle controls, toasts, and confirmation dialogs"
```

---

## Chunk 4: Live Execution Status

### Task 14: Create RunProgressBanner

**Files:**
- Create: `client/src/components/pipeline/RunProgressBanner.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { usePipelineStore } from '@/stores/pipelineStore';

export function RunProgressBanner() {
  const { activeRunId, nodeRunStatuses, nodes } = usePipelineStore();

  if (!activeRunId) return null;

  const totalNodes = nodes.length;
  const completedNodes = Object.values(nodeRunStatuses).filter(
    s => s === 'success' || s === 'failed' || s === 'skipped'
  ).length;
  const hasFailed = Object.entries(nodeRunStatuses).some(([, s]) => s === 'failed');
  const allDone = completedNodes === totalNodes && totalNodes > 0;
  const failedNodeId = Object.entries(nodeRunStatuses).find(([, s]) => s === 'failed')?.[0];
  const failedNodeName = failedNodeId ? nodes.find(n => n.id === failedNodeId)?.label : undefined;

  if (allDone && hasFailed) {
    return (
      <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center justify-between">
        <span className="text-sm text-red-300">
          Pipeline failed{failedNodeName ? ` at "${failedNodeName}"` : ''}
        </span>
        <button
          onClick={() => usePipelineStore.getState().clearRunStatus()}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30 flex items-center justify-between">
        <span className="text-sm text-emerald-300">Pipeline completed successfully</span>
        <button
          onClick={() => usePipelineStore.getState().clearRunStatus()}
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2">
      <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-amber-300">
        Pipeline running... ({completedNodes}/{totalNodes} nodes complete)
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/RunProgressBanner.tsx
git commit -m "feat: add run progress banner component for live pipeline status"
```

---

### Task 15: Add run status polling to PipelineBuilderPage

**Files:**
- Modify: `client/src/pages/PipelineBuilderPage.tsx`

- [ ] **Step 1: Add polling, navigation blocker, and banner**

Replace the entire contents of `client/src/pages/PipelineBuilderPage.tsx`:

```typescript
import { useEffect, useCallback } from 'react';
import { useParams, useBlocker } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { PipelineCanvas } from '@/components/pipeline/PipelineCanvas';
import { PipelineToolbar } from '@/components/pipeline/PipelineToolbar';
import { NodePalette } from '@/components/pipeline/NodePalette';
import { NodeConfigDrawer } from '@/components/pipeline/NodeConfigDrawer';
import { RunProgressBanner } from '@/components/pipeline/RunProgressBanner';
import { usePipelineStore } from '@/stores/pipelineStore';
import { fetchPipeline, fetchRunDetail } from '@/api/pipelines';
import type { NodeRunStatus } from '@mapforge/shared';

const TERMINAL_STATUSES = ['success', 'failed', 'cancelled'];

export function PipelineBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const store = usePipelineStore();

  // Load pipeline
  useEffect(() => {
    if (id && id !== 'new') {
      fetchPipeline(id).then(data => {
        store.loadPipeline({
          id: data.id, name: data.name,
          nodes: data.nodes, edges: data.edges,
          triggerType: data.triggerType, triggerConfig: data.triggerConfig,
          status: data.status,
        });
      }).catch(console.error);
    } else {
      store.reset();
    }
  }, [id]);

  // Poll run status
  useEffect(() => {
    const runId = usePipelineStore.getState().activeRunId;
    if (!runId) return;

    const interval = setInterval(async () => {
      try {
        const { run, nodeRuns } = await fetchRunDetail(runId);
        const statuses: Record<string, NodeRunStatus> = {};
        const details: Record<string, { inputRowCount: number | null; outputRowCount: number | null; startedAt: string | null; completedAt: string | null; errorMessage: string | null }> = {};
        for (const nr of nodeRuns) {
          statuses[nr.nodeId] = nr.status;
          details[nr.nodeId] = {
            inputRowCount: nr.inputRowCount,
            outputRowCount: nr.outputRowCount,
            startedAt: nr.startedAt,
            completedAt: nr.completedAt,
            errorMessage: nr.errorMessage,
          };
        }
        usePipelineStore.getState().setNodeRunStatuses(statuses);
        usePipelineStore.getState().setNodeRunDetails(details);

        if (TERMINAL_STATUSES.includes(run.status)) {
          usePipelineStore.getState().setActiveRunId(null);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [store.activeRunId]);

  // Unsaved changes warning
  const blocker = useBlocker(
    useCallback(() => usePipelineStore.getState().isDirty, [])
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (usePipelineStore.getState().isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return (
    <AppLayout title="Pipeline Builder">
      <div className="flex flex-col h-full">
        <PipelineToolbar />
        <RunProgressBanner />
        {blocker.state === 'blocked' && (
          <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/30 flex items-center justify-between">
            <span className="text-sm text-yellow-300">You have unsaved changes.</span>
            <div className="flex gap-2">
              <button onClick={() => blocker.proceed?.()} className="text-xs text-yellow-400 hover:text-yellow-300">
                Leave anyway
              </button>
              <button onClick={() => blocker.reset?.()} className="text-xs text-forge-300 hover:text-forge-100">
                Stay
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <NodePalette />
          <div className="flex-1 min-h-0">
            <PipelineCanvas />
          </div>
          <NodeConfigDrawer />
        </div>
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/PipelineBuilderPage.tsx
git commit -m "feat: add run status polling, navigation blocker, and progress banner to pipeline builder"
```

---

### Task 16: Add visual run status to canvas nodes

**Files:**
- Modify: `client/src/components/pipeline/PipelineCanvas.tsx`
- Modify: `client/src/components/pipeline/nodes/BigQuerySourceNode.tsx`
- Modify: `client/src/components/pipeline/nodes/BigQueryDestNode.tsx`
- Modify: `client/src/components/pipeline/nodes/ExerciseNode.tsx`
- Modify: `client/src/components/pipeline/nodes/ValidationGateNode.tsx`
- Modify: `client/src/components/pipeline/nodes/TransformNode.tsx`
- Modify: `client/src/components/pipeline/nodes/NotificationNode.tsx`

- [ ] **Step 1: Update PipelineCanvas to pass run status via node data**

In `client/src/components/pipeline/PipelineCanvas.tsx`, update the `storeNodesToRF` function to include run status from the store:

```typescript
function storeNodesToRF(storeNodes: ReturnType<typeof usePipelineStore.getState>['nodes']): Node[] {
  const { nodeRunStatuses, validationErrors } = usePipelineStore.getState();
  return storeNodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: {
      label: n.label,
      config: n.config,
      runStatus: nodeRunStatuses[n.id] as string | undefined,
      hasValidationError: validationErrors.some(e => e.nodeId === n.id),
    },
  }));
}
```

Also subscribe to `nodeRunStatuses` and `validationErrors` in the component so RF nodes re-render:

Add after the existing `const store = usePipelineStore();` line:

```typescript
const nodeRunStatuses = usePipelineStore(s => s.nodeRunStatuses);
const validationErrors = usePipelineStore(s => s.validationErrors);
```

Update the `useEffect` that syncs store nodes to RF — add `nodeRunStatuses` and `validationErrors` to its dependency array:

```typescript
useEffect(() => {
  setRfNodes(storeNodesToRF(store.nodes));
}, [store.nodes, nodeRunStatuses, validationErrors, setRfNodes]);
```

Remove the `prevStoreNodesRef` logic (replaced by the simpler dependency-based sync above).

- [ ] **Step 2: Create a shared node wrapper**

Create `client/src/components/pipeline/nodes/NodeStatusWrapper.tsx`:

```typescript
import type { NodeRunStatus } from '@mapforge/shared';
import { CheckCircle, XCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  baseColor: string;
  runStatus?: string;
  hasValidationError?: boolean;
}

const STATUS_STYLES: Record<NodeRunStatus, string> = {
  pending: 'border-gray-400 border-dashed',
  running: 'border-amber-400 animate-pulse',
  success: 'border-emerald-400',
  failed: 'border-red-400',
  skipped: 'opacity-50 border-forge-600',
};

export function NodeStatusWrapper({ children, baseColor, runStatus, hasValidationError }: Props) {
  const statusStyle = runStatus ? STATUS_STYLES[runStatus as NodeRunStatus] : '';

  return (
    <div className={`px-4 py-3 bg-forge-800 border-2 rounded-lg shadow-lg min-w-[160px] relative ${statusStyle || ''}`}
      style={!statusStyle ? { borderColor: `${baseColor}80` } : undefined}
    >
      {children}
      {runStatus === 'success' && (
        <CheckCircle size={14} className="absolute top-1 right-1 text-emerald-400" />
      )}
      {runStatus === 'failed' && (
        <XCircle size={14} className="absolute top-1 right-1 text-red-400" />
      )}
      {hasValidationError && !runStatus && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-forge-800" />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update all 6 node components to use the wrapper**

Update `BigQuerySourceNode.tsx`:

```typescript
import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function BigQuerySourceNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#3b82f6" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-blue-400 text-lg">&#9707;</span>
        <span className="text-forge-100 text-sm font-medium">{data.label || 'BQ Source'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
```

Update `BigQueryDestNode.tsx`:

```typescript
import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function BigQueryDestNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#a855f7" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-purple-400 text-lg">&#9707;</span>
        <span className="text-forge-100 text-sm font-medium">{data.label || 'BQ Destination'}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-purple-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
```

Update `ExerciseNode.tsx`:

```typescript
import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function ExerciseNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#f59e0b" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-lg">&#9998;</span>
        <span className="text-forge-100 text-sm font-medium">{data.label || 'Exercise'}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
```

Update `ValidationGateNode.tsx`:

```typescript
import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function ValidationGateNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#22c55e" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 text-lg">&#10003;</span>
        <span className="text-forge-100 text-sm font-medium">{data.label || 'Validation'}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-emerald-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
```

Update `TransformNode.tsx`:

```typescript
import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function TransformNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#06b6d4" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-cyan-400 text-lg">&#8644;</span>
        <span className="text-forge-100 text-sm font-medium">{data.label || 'Transform'}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
```

Update `NotificationNode.tsx`:

```typescript
import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function NotificationNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#eab308" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-yellow-400 text-lg">&#9993;</span>
        <span className="text-forge-100 text-sm font-medium">{data.label || 'Notification'}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-yellow-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
```

- [ ] **Step 4: Verify typecheck**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/pipeline/PipelineCanvas.tsx client/src/components/pipeline/nodes/
git commit -m "feat: add visual run status indicators and validation badges to pipeline nodes"
```

---

## Chunk 5: Save-time Validation

### Task 17: Create pipeline validation utility

**Files:**
- Create: `client/src/utils/pipelineValidation.ts`
- Test: `client/src/__tests__/pipelineValidation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `client/src/__tests__/pipelineValidation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validatePipeline } from '../utils/pipelineValidation';
import type { PipelineNode, PipelineEdge } from '@mapforge/shared';

const makeNode = (overrides: Partial<PipelineNode> & { id: string; type: PipelineNode['type'] }): PipelineNode => ({
  label: 'Test',
  position: { x: 0, y: 0 },
  config: { nodeType: overrides.type } as any,
  ...overrides,
});

describe('validatePipeline', () => {
  it('returns error when no source node', () => {
    const nodes = [makeNode({ id: 'n1', type: 'transform' })];
    const edges: PipelineEdge[] = [];
    const errors = validatePipeline(nodes, edges, 'manual', {});
    expect(errors.some(e => e.message.includes('source'))).toBe(true);
  });

  it('returns error for orphaned nodes', () => {
    const nodes = [
      makeNode({ id: 'n1', type: 'bigquery_source' }),
      makeNode({ id: 'n2', type: 'transform' }),
    ];
    const edges: PipelineEdge[] = [];
    const errors = validatePipeline(nodes, edges, 'manual', {});
    expect(errors.some(e => e.message.includes('not connected'))).toBe(true);
  });

  it('detects cycles', () => {
    const nodes = [
      makeNode({ id: 'n1', type: 'bigquery_source' }),
      makeNode({ id: 'n2', type: 'transform' }),
    ];
    const edges: PipelineEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n1' },
    ];
    const errors = validatePipeline(nodes, edges, 'manual', {});
    expect(errors.some(e => e.message.includes('cycle'))).toBe(true);
  });

  it('returns no errors for valid pipeline', () => {
    const nodes = [
      makeNode({ id: 'n1', type: 'bigquery_source', config: { nodeType: 'bigquery_source', credentialId: 'c1', gcpProject: 'p', dataset: 'd', tableOrQuery: 't', queryType: 'table' } as any }),
      makeNode({ id: 'n2', type: 'bigquery_destination', config: { nodeType: 'bigquery_destination', credentialId: 'c1', gcpProject: 'p', dataset: 'd', tableName: 't', writeMode: 'append' } as any }),
    ];
    const edges: PipelineEdge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
    const errors = validatePipeline(nodes, edges, 'manual', {});
    expect(errors).toHaveLength(0);
  });

  it('validates cron expression when trigger is cron', () => {
    const nodes = [
      makeNode({ id: 'n1', type: 'bigquery_source', config: { nodeType: 'bigquery_source', credentialId: 'c1', gcpProject: 'p', dataset: 'd', tableOrQuery: 't', queryType: 'table' } as any }),
    ];
    const edges: PipelineEdge[] = [];
    const errors = validatePipeline(nodes, edges, 'cron', {});
    expect(errors.some(e => e.message.includes('cron'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd client && npx vitest run src/__tests__/pipelineValidation.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the validation utility**

Create `client/src/utils/pipelineValidation.ts`:

```typescript
import type { PipelineNode, PipelineEdge } from '@mapforge/shared';

interface ValidationError {
  nodeId?: string;
  message: string;
}

export function validatePipeline(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  triggerType: string,
  triggerConfig: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Must have at least one source node
  if (!nodes.some(n => n.type === 'bigquery_source')) {
    errors.push({ message: 'Pipeline must have at least one BigQuery source node' });
  }

  // 2. No orphaned nodes (every node must be connected to at least one edge)
  // Exception: single-node pipelines (just a source) are allowed
  if (nodes.length > 1) {
    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }
    for (const node of nodes) {
      if (!connectedNodeIds.has(node.id)) {
        errors.push({ nodeId: node.id, message: `"${node.label}" is not connected to any other node` });
      }
    }
  }

  // 3. Cycle detection (Kahn's algorithm)
  if (hasCycle(nodes, edges)) {
    errors.push({ message: 'Pipeline contains a cycle — nodes cannot form a loop' });
  }

  // 4. Required config per node type
  for (const node of nodes) {
    const configErrors = validateNodeConfig(node);
    errors.push(...configErrors);
  }

  // 5. Trigger config
  if (triggerType === 'cron') {
    const cronExpression = (triggerConfig as { cronExpression?: string }).cronExpression;
    if (!cronExpression || cronExpression.trim() === '') {
      errors.push({ message: 'Scheduled trigger requires a cron expression' });
    } else {
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length < 5 || parts.length > 6) {
        errors.push({ message: 'Invalid cron expression — must have 5 or 6 fields' });
      }
    }
  }

  return errors;
}

function hasCycle(nodes: PipelineNode[], edges: PipelineEdge[]): boolean {
  const inDegree: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adjacency[node.id] = [];
  }
  for (const edge of edges) {
    if (inDegree[edge.target] !== undefined) {
      inDegree[edge.target]++;
    }
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
  }

  const queue = Object.entries(inDegree)
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id);

  let visited = 0;
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    visited++;
    for (const neighbor of adjacency[nodeId] || []) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  return visited !== nodes.length;
}

function validateNodeConfig(node: PipelineNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = node.config;

  switch (node.type) {
    case 'bigquery_source': {
      const c = config as any;
      if (!c.credentialId) errors.push({ nodeId: node.id, message: `"${node.label}": Credential is required` });
      if (!c.gcpProject) errors.push({ nodeId: node.id, message: `"${node.label}": GCP Project is required` });
      if (!c.dataset) errors.push({ nodeId: node.id, message: `"${node.label}": Dataset is required` });
      if (!c.tableOrQuery) errors.push({ nodeId: node.id, message: `"${node.label}": Table name or query is required` });
      break;
    }
    case 'bigquery_destination': {
      const c = config as any;
      if (!c.credentialId) errors.push({ nodeId: node.id, message: `"${node.label}": Credential is required` });
      if (!c.gcpProject) errors.push({ nodeId: node.id, message: `"${node.label}": GCP Project is required` });
      if (!c.dataset) errors.push({ nodeId: node.id, message: `"${node.label}": Dataset is required` });
      if (!c.tableName) errors.push({ nodeId: node.id, message: `"${node.label}": Table name is required` });
      if (!c.writeMode) errors.push({ nodeId: node.id, message: `"${node.label}": Write mode is required` });
      if (c.writeMode === 'merge' && (!c.mergeKeyColumns || c.mergeKeyColumns.length === 0)) {
        errors.push({ nodeId: node.id, message: `"${node.label}": Merge key columns are required for merge mode` });
      }
      break;
    }
    case 'enrichment_exercise': {
      const c = config as any;
      if (!c.exerciseId) errors.push({ nodeId: node.id, message: `"${node.label}": Exercise is required` });
      break;
    }
    case 'validation_gate': {
      const c = config as any;
      if (!c.rules || c.rules.length === 0) errors.push({ nodeId: node.id, message: `"${node.label}": At least one validation rule is required` });
      break;
    }
    case 'notification': {
      const c = config as any;
      if (!c.channels || c.channels.length === 0) errors.push({ nodeId: node.id, message: `"${node.label}": At least one notification channel is required` });
      break;
    }
  }

  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd client && npx vitest run src/__tests__/pipelineValidation.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/pipelineValidation.ts client/src/__tests__/pipelineValidation.test.ts
git commit -m "feat: add client-side pipeline validation with cycle detection and config checks"
```

---

### Task 18: Wire validation into save flow

**Files:**
- Modify: `client/src/components/pipeline/PipelineToolbar.tsx`

- [ ] **Step 1: Import and call validation before save**

In `client/src/components/pipeline/PipelineToolbar.tsx`, add import at the top:

```typescript
import { validatePipeline } from '@/utils/pipelineValidation';
```

Update `handleSave` to validate first — add at the beginning of the function, before `setSaving(true)`:

```typescript
    const errors = validatePipeline(store.nodes, store.edges, store.triggerType, store.triggerConfig);
    if (errors.length > 0) {
      store.setValidationErrors(errors);
      const nodeErrors = errors.filter(e => e.nodeId);
      const globalErrors = errors.filter(e => !e.nodeId);
      if (globalErrors.length > 0) {
        toast.error(globalErrors.map(e => e.message).join('\n'));
      }
      if (nodeErrors.length > 0) {
        toast.error(`${nodeErrors.length} node(s) have configuration errors`);
        // Pan to first errored node
        const firstErrorNodeId = nodeErrors[0].nodeId;
        if (firstErrorNodeId) store.selectNode(firstErrorNodeId);
      }
      return;
    }
    store.setValidationErrors([]);
```

- [ ] **Step 2: Verify typecheck**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pipeline/PipelineToolbar.tsx
git commit -m "feat: wire pipeline validation into save flow with error toasts and node selection"
```

---

### Task 19: Run full test suite and verify

- [ ] **Step 1: Run client tests**

```bash
cd client && npx vitest run
```

Expected: all tests pass

- [ ] **Step 2: Run server tests**

```bash
cd server && npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no type errors

- [ ] **Step 4: Final commit if any fixes needed**

Fix any issues found and commit with appropriate message.
