# Phase 1: Foundations & Business User Dashboard

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the MapForge monorepo scaffold, shared type system, auth context, API client, common UI components, layout shell, and the complete Business User Dashboard -- delivering the first usable screen end-to-end from database to browser.

**Architecture:** Three-package monorepo (client, server, shared). The client is a Vite + React 19 SPA that communicates with an Express 5 API server via Axios. Shared types live in a dedicated package imported by both sides. State management uses Zustand for local UI state and TanStack React Query for server state, with Drizzle ORM on the backend talking to PostgreSQL 16.

**Tech Stack:** React 19, Vite 7, TypeScript 5.7, Tailwind CSS 4, Zustand 5, TanStack React Query 5, Axios, Express 5, Drizzle ORM, PostgreSQL 16, lucide-react, react-hot-toast, lodash-es

**Depends on:** Nothing (this is the first phase)

**Spec reference:** `docs/superpowers/specs/2026-03-11-mapforge-user-facing-screens-design.md` Sections 1 and 2

---

## Task 1: Project Scaffold

**Goal:** Initialize the monorepo with client, server, and shared packages. All three should build cleanly.

### Files

| Action | Path |
|--------|------|
| Create | `package.json` (root workspace) |
| Create | `client/package.json` |
| Create | `client/index.html` |
| Create | `client/vite.config.ts` |
| Create | `client/tsconfig.json` |
| Create | `client/src/main.tsx` |
| Create | `client/src/App.tsx` |
| Create | `client/src/index.css` |
| Create | `client/src/vite-env.d.ts` |
| Create | `server/package.json` |
| Create | `server/tsconfig.json` |
| Create | `server/src/index.ts` |
| Create | `shared/package.json` |
| Create | `shared/tsconfig.json` |
| Create | `shared/src/index.ts` |
| Create | `tsconfig.base.json` |
| Create | `.gitignore` |

### Steps

- [ ] Create root `package.json` with npm workspaces:

```json
{
  "name": "mapforge",
  "private": true,
  "workspaces": ["client", "server", "shared"],
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "npm run dev --workspace=client",
    "dev:server": "npm run dev --workspace=server",
    "build": "npm run build --workspace=shared && npm run build --workspace=client && npm run build --workspace=server",
    "build:client": "npm run build --workspace=client",
    "build:server": "npm run build --workspace=server",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  },
  "devDependencies": {
    "concurrently": "^9.1.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] Create `tsconfig.base.json` at root with shared compiler options:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] Create `shared/package.json`:

```json
{
  "name": "@mapforge/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] Create `shared/tsconfig.json` extending the base config.

- [ ] Create `shared/src/index.ts` as a barrel export (empty for now, populated in Task 2).

- [ ] Create `client/package.json` with dependencies:

```json
{
  "name": "@mapforge/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@mapforge/shared": "*",
    "@tanstack/react-query": "^5.62.0",
    "axios": "^1.7.9",
    "lodash-es": "^4.17.21",
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^7.1.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/lodash-es": "^4.17.12",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "tailwindcss": "^4.0.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] Create `client/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

- [ ] Create `client/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@mapforge/shared": ["../shared/src"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

- [ ] Create `client/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MapForge</title>
  </head>
  <body class="bg-forge-950 text-forge-50 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] Create `client/src/index.css` -- copy the "Industrial Precision" design system from OneSchemaClone. This includes:
  - Tailwind v4 `@import "tailwindcss"` directive
  - `@theme` block with forge color palette, amber/cyan accents, status colors
  - DM Sans + JetBrains Mono font imports
  - 4px spacing grid, sharp border radii
  - Custom utility classes (`.glass`, `.glow-amber`, etc.)

- [ ] Create `client/src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />
```

- [ ] Create `client/src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] Create `client/src/App.tsx` (minimal shell):

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <div className="min-h-screen bg-forge-950 text-forge-50">
          <p className="p-8 text-forge-300">MapForge is loading...</p>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

- [ ] Create `server/package.json`:

```json
{
  "name": "@mapforge/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@mapforge/shared": "*",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "drizzle-orm": "^0.38.0",
    "express": "^5.0.1",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] Create `server/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

- [ ] Create `server/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`MapForge server running on port ${PORT}`);
});
```

- [ ] Create `.gitignore`:

```
node_modules/
dist/
.env
.env.local
*.tsbuildinfo
```

- [ ] Install dependencies: `npm install`

- [ ] Verify the scaffold builds:

```bash
npm run typecheck
# Expected: all three packages pass type checking with no errors
```

**Commit:** `scaffold: initialize monorepo with client, server, and shared packages`

---

## Task 2: Shared Types

**Goal:** Create all TypeScript interfaces from Section 1.4 of the design spec. These types are consumed by both client and server.

### Files

| Action | Path |
|--------|------|
| Create | `shared/src/types/exercise.ts` |
| Create | `shared/src/types/record.ts` |
| Create | `shared/src/types/classification.ts` |
| Create | `shared/src/types/admin.ts` |
| Create | `shared/src/types/auth.ts` |
| Create | `shared/src/types/api.ts` |
| Create | `shared/src/types/index.ts` |
| Modify | `shared/src/index.ts` |

### Steps

- [ ] Create `shared/src/types/auth.ts`:

```typescript
export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatarUrl: string | null;
}
```

- [ ] Create `shared/src/types/exercise.ts`:

```typescript
export interface ExerciseListItem {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  totalRecords: number;
  classifiedRecords: number;
  errorCount: number;
  lastUpdatedAt: string;
  deadline: string | null;
  hasNewRecords: boolean;
  newRecordCount: number;
  columnStats: ColumnStat[];
}

export interface ColumnStat {
  columnKey: string;
  label: string;
  filledCount: number;
  totalCount: number;
  percentage: number;
}

export interface ExerciseDetail {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  sourceColumns: ExerciseColumn[];
  classificationColumns: ExerciseColumn[];
  deadline: string | null;
  lastRefreshedAt: string;
}

export interface ExerciseColumn {
  id: string;
  key: string;
  label: string;
  description: string | null;
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'picklist' | 'multi_select';
  columnRole: 'source' | 'classification' | 'computed';
  required: boolean;
  defaultValue: string | null;
  config: ColumnConfig;
  validationRules: ValidationRule[];
  referenceLink: ReferenceLink | null;
  dependentConfig: DependentPicklistConfig | null;
  visible: boolean;
  ordinal: number;
}

export interface ColumnConfig {
  picklistValues?: string[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  regexPattern?: string;
  dateFormat?: string;
  minDate?: string;
  maxDate?: string;
}

export interface DependentPicklistConfig {
  parentColumnKey: string;
  referenceTableId: string;
  parentReferenceColumn: string;
  childReferenceColumn: string;
}

export interface ReferenceLink {
  referenceTableId: string;
  referenceColumnKey: string;
  displayColumnKey: string;
}

export interface ValidationRule {
  type: 'required' | 'enum' | 'range' | 'date_range' | 'regex' | 'dependent' | 'relational';
  config: Record<string, unknown>;
  severity: 'error' | 'warning';
  message: string;
}

export interface ExerciseStats {
  totalRecords: number;
  classifiedRecords: number;
  unclassifiedRecords: number;
  errorCount: number;
  warningCount: number;
  newRecordCount: number;
  completionPercentage: number;
  columnStats: ColumnStat[];
}
```

- [ ] Create `shared/src/types/record.ts`:

```typescript
import type { CellError } from './classification';

export interface EnrichmentRecord {
  id: string;
  uniqueKey: Record<string, string>;
  sourceData: Record<string, unknown>;
  classifications: Record<string, string | null>;
  recordState: 'new' | 'existing' | 'changed' | 'removed';
  validationErrors: CellError[];
  isFullyClassified: boolean;
}

export interface RecordQueryParams {
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  filter?: 'all' | 'unclassified' | 'classified' | 'errors' | 'new';
  search?: string;
}

export interface PaginatedRecords {
  records: EnrichmentRecord[];
  total: number;
  page: number;
  pageSize: number;
  stats: import('./exercise').ExerciseStats;
}
```

- [ ] Create `shared/src/types/classification.ts`:

```typescript
export interface CellError {
  columnKey: string;
  severity: 'error' | 'warning';
  message: string;
  ruleType: string;
}

export interface ClassificationPayload {
  values: Array<{ columnKey: string; value: string | null }>;
}

export interface ClassificationResult {
  validationErrors: CellError[];
  isFullyClassified: boolean;
  updatedStats: import('./exercise').ExerciseStats;
}

export interface BulkClassificationPayload {
  recordIds: string[];
  values: Array<{ columnKey: string; value: string | null }>;
}

export interface BulkClassificationResult {
  updatedCount: number;
  errors: Array<{ recordId: string; errors: CellError[] }>;
  updatedStats: import('./exercise').ExerciseStats;
}
```

- [ ] Create `shared/src/types/admin.ts`:

```typescript
import type { ExerciseListItem } from './exercise';

export interface AdminExerciseListItem extends ExerciseListItem {
  assignedUsers: AssignedUserSummary[];
  createdBy: string;
  createdAt: string;
}

export interface AssignedUserSummary {
  id: string;
  name: string;
  email: string;
  role: 'editor' | 'viewer';
  classifiedCount: number;
  lastActiveAt: string | null;
}

export interface ExerciseProgressDetail {
  exercise: AdminExerciseListItem;
  userProgress: UserProgress[];
}

export interface UserProgress {
  user: AssignedUserSummary;
  assignedRecords: number;
  classifiedRecords: number;
  errorCount: number;
  lastActiveAt: string | null;
  completionPercentage: number;
}
```

- [ ] Create `shared/src/types/api.ts`:

```typescript
export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
```

- [ ] Create `shared/src/types/index.ts` barrel export:

```typescript
export * from './auth';
export * from './exercise';
export * from './record';
export * from './classification';
export * from './admin';
export * from './api';
```

- [ ] Update `shared/src/index.ts`:

```typescript
export * from './types/index';
```

- [ ] Verify types compile:

```bash
cd shared && npx tsc --noEmit
# Expected: 0 errors
```

**Commit:** `feat: add shared TypeScript types for exercises, records, classifications, and admin`

---

## Task 3: Auth Context & Routing

**Goal:** Create the AuthContext provider, ProtectedRoute component, React Router setup with role-based routing, and a login page placeholder.

### Files

| Action | Path |
|--------|------|
| Create | `client/src/contexts/AuthContext.tsx` |
| Create | `client/src/components/common/ProtectedRoute.tsx` |
| Create | `client/src/pages/LoginPage.tsx` |
| Create | `client/src/pages/BusinessDashboardPage.tsx` (placeholder) |
| Modify | `client/src/App.tsx` |

### Steps

- [ ] Create `client/src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '@mapforge/shared';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'mapforge_token';
const USER_KEY = 'mapforge_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, _password: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with real API call in later phase
      // For now, mock login based on email domain
      const mockUser: AuthUser = {
        id: 'user-1',
        orgId: 'org-1',
        email,
        name: email.split('@')[0],
        role: email.includes('admin') ? 'admin' : 'user',
        avatarUrl: null,
      };
      const mockToken = 'mock-jwt-token';

      localStorage.setItem(TOKEN_KEY, mockToken);
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      setToken(mockToken);
      setUser(mockUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] Create `client/src/components/common/ProtectedRoute.tsx`:

```typescript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@mapforge/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AuthUser['role'][];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirect = user.role === 'admin' ? '/admin' : '/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
```

- [ ] Create `client/src/pages/LoginPage.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    navigate(email.includes('admin') ? '/admin' : '/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-forge-950">
      <div className="w-full max-w-sm bg-forge-900 border border-forge-700 rounded-md p-8">
        <h1 className="text-xl font-semibold text-forge-50 mb-6">Sign in to MapForge</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-forge-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-forge-850 border border-forge-700 rounded text-forge-50 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-forge-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-forge-850 border border-forge-700 rounded text-forge-50 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              placeholder="Enter password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-forge-950 font-semibold rounded text-sm transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-xs text-forge-500 text-center">
          Use any email to sign in. Include "admin" in the email for admin role.
        </p>
      </div>
    </div>
  );
}
```

- [ ] Create `client/src/pages/BusinessDashboardPage.tsx` (placeholder):

```typescript
export function BusinessDashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-forge-50">My Assignments</h1>
      <p className="text-forge-400 mt-2">Dashboard coming in Task 8-10.</p>
    </div>
  );
}
```

- [ ] Update `client/src/App.tsx` with routing:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { BusinessDashboardPage } from '@/pages/BusinessDashboardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RootRedirect />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <BusinessDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <div className="p-8 text-forge-300">Admin Dashboard placeholder</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

- [ ] Verify:

```bash
npm run dev:client
# Navigate to http://localhost:5173 -- should redirect to /login
# Sign in with "user@test.com" -- should redirect to /dashboard
# Sign in with "admin@test.com" -- should redirect to /admin
```

**Commit:** `feat: add auth context, protected routes, and role-based routing`

---

## Task 4: API Client Layer

**Goal:** Create the Axios instance with JWT interceptors and all API function signatures from the spec.

### Files

| Action | Path |
|--------|------|
| Create | `client/src/api/client.ts` |
| Create | `client/src/api/exercises.ts` |
| Create | `client/src/api/admin.ts` |
| Create | `client/src/api/reference-tables.ts` |

### Steps

- [ ] Create `client/src/api/client.ts`:

```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('mapforge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 by clearing auth and redirecting
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mapforge_token');
      localStorage.removeItem('mapforge_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

- [ ] Create `client/src/api/exercises.ts`:

```typescript
import { apiClient } from './client';
import type {
  ExerciseListItem,
  ExerciseDetail,
  PaginatedRecords,
  RecordQueryParams,
  ClassificationPayload,
  ClassificationResult,
  BulkClassificationPayload,
  BulkClassificationResult,
  ExerciseStats,
} from '@mapforge/shared';

export async function fetchMyExercises(): Promise<ExerciseListItem[]> {
  const response = await apiClient.get<{ exercises: ExerciseListItem[] }>('/exercises');
  return response.data.exercises;
}

export async function fetchExerciseDetail(id: string): Promise<ExerciseDetail> {
  const response = await apiClient.get<ExerciseDetail>(`/exercises/${id}`);
  return response.data;
}

export async function fetchExerciseRecords(
  id: string,
  params: RecordQueryParams
): Promise<PaginatedRecords> {
  const response = await apiClient.get<PaginatedRecords>(`/exercises/${id}/records`, {
    params,
  });
  return response.data;
}

export async function classifyRecord(
  exerciseId: string,
  recordId: string,
  values: ClassificationPayload
): Promise<ClassificationResult> {
  const response = await apiClient.put<ClassificationResult>(
    `/exercises/${exerciseId}/records/${recordId}/classify`,
    values
  );
  return response.data;
}

export async function bulkClassify(
  exerciseId: string,
  payload: BulkClassificationPayload
): Promise<BulkClassificationResult> {
  const response = await apiClient.post<BulkClassificationResult>(
    `/exercises/${exerciseId}/records/bulk-classify`,
    payload
  );
  return response.data;
}

export async function fetchExerciseStats(id: string): Promise<ExerciseStats> {
  const response = await apiClient.get<ExerciseStats>(`/exercises/${id}/stats`);
  return response.data;
}

export async function exportExerciseRecords(id: string, filter: string): Promise<Blob> {
  const response = await apiClient.get(`/exercises/${id}/records/export`, {
    params: { filter },
    responseType: 'blob',
  });
  return response.data;
}
```

- [ ] Create `client/src/api/admin.ts`:

```typescript
import { apiClient } from './client';
import type {
  AdminExerciseListItem,
  ExerciseProgressDetail,
} from '@mapforge/shared';

export async function fetchAllExercises(): Promise<AdminExerciseListItem[]> {
  const response = await apiClient.get<{ exercises: AdminExerciseListItem[] }>(
    '/admin/exercises'
  );
  return response.data.exercises;
}

export async function fetchExerciseProgress(
  id: string
): Promise<ExerciseProgressDetail> {
  const response = await apiClient.get<ExerciseProgressDetail>(
    `/admin/exercises/${id}/progress`
  );
  return response.data;
}

export async function sendReminder(
  exerciseId: string,
  userId: string
): Promise<void> {
  await apiClient.post(`/admin/exercises/${exerciseId}/remind/${userId}`, {});
}

export async function exportExerciseProgress(id: string): Promise<Blob> {
  const response = await apiClient.get(`/admin/exercises/${id}/progress/export`, {
    responseType: 'blob',
  });
  return response.data;
}
```

- [ ] Create `client/src/api/reference-tables.ts`:

```typescript
import { apiClient } from './client';

interface ReferenceTableValuesParams {
  filterColumn: string;
  filterValue: string;
  valueColumn: string;
}

export async function fetchReferenceTableValues(
  tableId: string,
  params: ReferenceTableValuesParams
): Promise<{ values: string[] }> {
  const response = await apiClient.get<{ values: string[] }>(
    `/reference-tables/${tableId}/values`,
    { params }
  );
  return response.data;
}
```

- [ ] Verify types compile:

```bash
cd client && npx tsc --noEmit
# Expected: 0 errors
```

**Commit:** `feat: add Axios API client with interceptors and all endpoint functions`

---

## Task 5: Common Components

**Goal:** Build all shared UI components carried from the design system: Button, Card, Badge, ProgressBar, Input, Select, Modal, Tabs, Tooltip, Spinner, EmptyState.

### Files

| Action | Path |
|--------|------|
| Create | `client/src/components/common/Button.tsx` |
| Create | `client/src/components/common/Card.tsx` |
| Create | `client/src/components/common/Badge.tsx` |
| Create | `client/src/components/common/ProgressBar.tsx` |
| Create | `client/src/components/common/Input.tsx` |
| Create | `client/src/components/common/Select.tsx` |
| Create | `client/src/components/common/Modal.tsx` |
| Create | `client/src/components/common/Tabs.tsx` |
| Create | `client/src/components/common/Tooltip.tsx` |
| Create | `client/src/components/common/Spinner.tsx` |
| Create | `client/src/components/common/EmptyState.tsx` |
| Create | `client/src/components/common/index.ts` |

### Steps

- [ ] Create `client/src/components/common/Button.tsx`:

```typescript
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-amber-600 hover:bg-amber-500 text-forge-950 font-semibold shadow-sm',
  secondary:
    'bg-forge-800 hover:bg-forge-750 text-forge-100 border border-forge-700',
  ghost:
    'bg-transparent hover:bg-forge-800 text-forge-300 hover:text-forge-100',
  danger:
    'bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/30',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-6 py-2.5 text-base rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      isLoading,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      'inline-flex items-center justify-center gap-2 font-medium transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-1 focus:ring-offset-forge-900',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classes} disabled={disabled || isLoading} {...props}>
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {!isLoading && icon && iconPosition === 'left' && icon}
        {children}
        {!isLoading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

- [ ] Create `client/src/components/common/Card.tsx`:

```typescript
import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardGlow = 'none' | 'amber' | 'cyan';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hover?: boolean;
  glow?: CardGlow;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

const glowClasses: Record<CardGlow, string> = {
  none: '',
  amber: 'hover:shadow-[0_0_20px_rgba(217,119,6,0.08)]',
  cyan: 'hover:shadow-[0_0_20px_rgba(8,145,178,0.08)]',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', hover = false, glow = 'none', className, children, ...props }, ref) => {
    const classes = [
      'bg-forge-900 border border-forge-800 rounded-md',
      paddingClasses[padding],
      hover && 'cursor-pointer hover:border-forge-700 transition-all',
      glow !== 'none' && glowClasses[glow],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['flex flex-col space-y-1', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={['text-lg font-semibold text-forge-50', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={['text-sm text-forge-400', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </p>
  );
}
```

- [ ] Create `client/src/components/common/Badge.tsx`:

```typescript
import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

type BadgeVariant =
  | 'default'
  | 'amber'
  | 'cyan'
  | 'error'
  | 'warning'
  | 'clean'
  | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-forge-800 text-forge-300 border border-forge-700',
  amber: 'bg-amber-600/10 text-amber-400 border border-amber-500/30',
  cyan: 'bg-cyan-600/10 text-cyan-400 border border-cyan-500/30',
  error: 'bg-red-600/10 text-red-400 border border-red-600/30',
  warning: 'bg-amber-600/10 text-amber-400 border border-amber-500/30',
  clean: 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30',
  outline: 'bg-transparent text-forge-400 border border-forge-600',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    const classes = [
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
```

- [ ] Create `client/src/components/common/ProgressBar.tsx`:

```typescript
interface ProgressBarProps {
  value: number;
  max: number;
  variant?: 'amber' | 'cyan' | 'emerald';
  size?: 'sm' | 'md';
  label?: string;
  showPercentage?: boolean;
}

const barColorClasses: Record<string, string> = {
  amber: 'bg-amber-500',
  cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

export function ProgressBar({
  value,
  max,
  variant = 'amber',
  size = 'md',
  label,
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-forge-300">{label}</span>}
          {showPercentage && (
            <span className="text-xs text-forge-400">{percentage}%</span>
          )}
        </div>
      )}
      <div className={['w-full bg-forge-800 rounded-full overflow-hidden', sizeClasses[size]].join(' ')}>
        <div
          className={['h-full rounded-full transition-all duration-300', barColorClasses[variant]].join(' ')}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] Create `client/src/components/common/Input.tsx`:

```typescript
import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, error, className, ...props }, ref) => {
    const classes = [
      'w-full bg-forge-850 border rounded text-forge-50 text-sm',
      'placeholder:text-forge-600',
      'focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error ? 'border-red-500/50' : 'border-forge-700',
      icon ? 'pl-9 pr-3 py-2' : 'px-3 py-2',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-500">
            {icon}
          </div>
        )}
        <input ref={ref} className={classes} {...props} />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

- [ ] Create `client/src/components/common/Select.tsx`:

```typescript
import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, error, className, ...props }, ref) => {
    const classes = [
      'w-full bg-forge-850 border rounded text-forge-50 text-sm px-3 py-2',
      'focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error ? 'border-red-500/50' : 'border-forge-700',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div>
        <select ref={ref} className={classes} {...props}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
```

- [ ] Create `client/src/components/common/Modal.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ open, onClose, title, size = 'md', children, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={[
          'w-full bg-forge-900 border border-forge-700 rounded-md shadow-xl',
          sizeClasses[size],
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-forge-800">
          <h2 className="text-lg font-semibold text-forge-50">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-forge-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] Create `client/src/components/common/Tabs.tsx`:

```typescript
interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-forge-800">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const classes = [
          'px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
          'border-b-2 -mb-px',
          isActive
            ? 'text-amber-400 border-amber-500'
            : 'text-forge-400 border-transparent hover:text-forge-200 hover:border-forge-600',
        ].join(' ');

        return (
          <button key={tab.key} className={classes} onClick={() => onChange(tab.key)}>
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={[
                  'ml-1.5 px-1.5 py-0.5 rounded text-xs',
                  isActive
                    ? 'bg-amber-600/10 text-amber-300'
                    : 'bg-forge-800 text-forge-500',
                ].join(' ')}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] Create `client/src/components/common/Tooltip.tsx`:

```typescript
import { useState, useRef } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 200);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={[
            'absolute z-50 px-2 py-1 rounded bg-forge-800 border border-forge-700',
            'text-xs text-forge-200 whitespace-nowrap shadow-lg pointer-events-none',
            positionClasses[position],
          ].join(' ')}
        >
          {content}
        </div>
      )}
    </div>
  );
}
```

- [ ] Create `client/src/components/common/Spinner.tsx`:

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={['animate-spin text-amber-500', sizeClasses[size], className]
        .filter(Boolean)
        .join(' ')}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
```

- [ ] Create `client/src/components/common/EmptyState.tsx`:

```typescript
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  heading: string;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ icon, heading, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-forge-600 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-forge-200 mb-2">{heading}</h3>
      <p className="text-sm text-forge-400 max-w-sm mb-6">{body}</p>
      {action}
    </div>
  );
}
```

- [ ] Create `client/src/components/common/index.ts` barrel export:

```typescript
export { Button } from './Button';
export { Card, CardHeader, CardTitle, CardDescription } from './Card';
export { Badge } from './Badge';
export { ProgressBar } from './ProgressBar';
export { Input } from './Input';
export { Select } from './Select';
export { Modal } from './Modal';
export { Tabs } from './Tabs';
export { Tooltip } from './Tooltip';
export { Spinner } from './Spinner';
export { EmptyState } from './EmptyState';
export { ProtectedRoute } from './ProtectedRoute';
```

- [ ] Verify types compile:

```bash
cd client && npx tsc --noEmit
# Expected: 0 errors
```

**Commit:** `feat: add common UI components -- Button, Card, Badge, ProgressBar, Input, Select, Modal, Tabs, Tooltip, Spinner, EmptyState`

---

## Task 6: Layout Components

**Goal:** Build the TopBar, AppLayout, NotificationBell placeholder, and UserAvatar with dropdown.

### Files

| Action | Path |
|--------|------|
| Create | `client/src/components/layout/TopBar.tsx` |
| Create | `client/src/components/layout/AppLayout.tsx` |
| Create | `client/src/components/common/NotificationBell.tsx` |
| Create | `client/src/components/common/UserAvatar.tsx` |
| Create | `client/src/components/layout/index.ts` |

### Steps

- [ ] Create `client/src/components/common/UserAvatar.tsx`:

```typescript
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

interface UserAvatarProps {
  user: { name: string; avatarUrl: string | null };
  size?: 'sm' | 'md';
  showDropdown?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserAvatar({ user, size = 'sm', showDropdown = false }: UserAvatarProps) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const avatar = user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.name}
      className={['rounded-full object-cover', sizeClasses[size]].join(' ')}
    />
  ) : (
    <div
      className={[
        'rounded-full bg-forge-700 text-forge-300 font-medium flex items-center justify-center',
        sizeClasses[size],
      ].join(' ')}
    >
      {getInitials(user.name)}
    </div>
  );

  if (!showDropdown) return avatar;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="focus:outline-none">
        {avatar}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-forge-850 border border-forge-700 rounded-md shadow-xl z-50">
          <div className="px-3 py-2 border-b border-forge-700">
            <p className="text-sm font-medium text-forge-100">{user.name}</p>
          </div>
          <div className="py-1">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-forge-300 hover:bg-forge-800 hover:text-forge-100"
              onClick={() => {
                setOpen(false);
              }}
            >
              <User size={14} />
              Profile
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-forge-300 hover:bg-forge-800 hover:text-forge-100"
              onClick={() => {
                logout();
                setOpen(false);
              }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] Create `client/src/components/common/NotificationBell.tsx`:

```typescript
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  unreadCount?: number;
}

export function NotificationBell({ unreadCount = 0 }: NotificationBellProps) {
  return (
    <button className="relative p-1.5 text-forge-400 hover:text-forge-200 transition-colors focus:outline-none">
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-forge-950 text-[10px] font-bold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
```

- [ ] Create `client/src/components/layout/TopBar.tsx`:

```typescript
import type { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  children?: ReactNode;
}

export function TopBar({ title, children }: TopBarProps) {
  return (
    <div className="h-14 bg-forge-900 border-b border-forge-700 px-6 flex items-center justify-between shrink-0">
      <h1 className="text-lg font-semibold text-forge-100">{title}</h1>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
```

- [ ] Create `client/src/components/layout/AppLayout.tsx`:

```typescript
import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { NotificationBell } from '@/components/common/NotificationBell';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  title: string;
  children: ReactNode;
  topBarExtra?: ReactNode;
}

export function AppLayout({ title, children, topBarExtra }: AppLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-forge-950">
      <TopBar title={title}>
        {topBarExtra}
        <NotificationBell />
        {user && <UserAvatar user={user} size="sm" showDropdown />}
      </TopBar>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] Create `client/src/components/layout/index.ts`:

```typescript
export { TopBar } from './TopBar';
export { AppLayout } from './AppLayout';
```

- [ ] Verify types compile:

```bash
cd client && npx tsc --noEmit
# Expected: 0 errors
```

**Commit:** `feat: add layout components -- TopBar, AppLayout, NotificationBell, UserAvatar`

---

## Task 7: Business Dashboard - React Query Hooks

**Goal:** Create the `useMyExercises` hook with mock data for development testing.

### Files

| Action | Path |
|--------|------|
| Create | `client/src/hooks/useExercises.ts` |
| Create | `client/src/mocks/exercises.ts` |

### Steps

- [ ] Create `client/src/mocks/exercises.ts` with test data:

```typescript
import type { ExerciseListItem } from '@mapforge/shared';

export const mockExercises: ExerciseListItem[] = [
  {
    id: 'ex-1',
    name: 'Development Programming 2026',
    description: 'Classify program registrations by sport and category',
    status: 'active',
    totalRecords: 342,
    classifiedRecords: 267,
    errorCount: 3,
    lastUpdatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    deadline: '2026-04-15T00:00:00.000Z',
    hasNewRecords: true,
    newRecordCount: 12,
    columnStats: [
      { columnKey: 'sportCategory', label: 'Sport Category', filledCount: 325, totalCount: 342, percentage: 95 },
      { columnKey: 'categorization', label: 'Categorization', filledCount: 274, totalCount: 342, percentage: 80 },
    ],
  },
  {
    id: 'ex-2',
    name: 'Draft Ranking Weights 2026',
    description: 'Assign weights by tier, rank, and position',
    status: 'active',
    totalRecords: 24,
    classifiedRecords: 0,
    errorCount: 0,
    lastUpdatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    deadline: '2026-03-31T00:00:00.000Z',
    hasNewRecords: false,
    newRecordCount: 0,
    columnStats: [
      { columnKey: 'tierWeight', label: 'Tier Weight', filledCount: 0, totalCount: 24, percentage: 0 },
      { columnKey: 'positionWeight', label: 'Position Weight', filledCount: 0, totalCount: 24, percentage: 0 },
    ],
  },
  {
    id: 'ex-3',
    name: 'Scouting Event Classification',
    description: 'Map scouting events to regions and event types for the 2026 season',
    status: 'active',
    totalRecords: 156,
    classifiedRecords: 156,
    errorCount: 0,
    lastUpdatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    deadline: '2026-05-01T00:00:00.000Z',
    hasNewRecords: false,
    newRecordCount: 0,
    columnStats: [
      { columnKey: 'region', label: 'Region', filledCount: 156, totalCount: 156, percentage: 100 },
      { columnKey: 'eventType', label: 'Event Type', filledCount: 156, totalCount: 156, percentage: 100 },
    ],
  },
];
```

- [ ] Create `client/src/hooks/useExercises.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchMyExercises } from '@/api/exercises';

export function useMyExercises() {
  return useQuery({
    queryKey: ['my-exercises'],
    queryFn: fetchMyExercises,
    staleTime: 30_000,
  });
}
```

- [ ] Verify types compile:

```bash
cd client && npx tsc --noEmit
# Expected: 0 errors
```

**Commit:** `feat: add useMyExercises React Query hook and mock exercise data`

---

## Task 8: Business Dashboard - StatusSummaryBar

**Goal:** Build the StatusSummaryBar that shows 4 stat pills computed from the exercises list.

### Files

| Action | Path |
|--------|------|
| Create | `client/src/components/dashboard/StatusSummaryBar.tsx` |

### Steps

- [ ] Create `client/src/components/dashboard/StatusSummaryBar.tsx`:

```typescript
import type { ExerciseListItem } from '@mapforge/shared';

interface StatusSummaryBarProps {
  exercises: ExerciseListItem[];
}

interface StatPill {
  label: string;
  count: number;
  highlight?: boolean;
}

function computeStats(exercises: ExerciseListItem[]): StatPill[] {
  const total = exercises.length;
  const needsAttention = exercises.filter(
    (e) => e.hasNewRecords || e.errorCount > 0
  ).length;
  const inProgress = exercises.filter(
    (e) => e.classifiedRecords > 0 && e.classifiedRecords < e.totalRecords
  ).length;
  const complete = exercises.filter(
    (e) => e.classifiedRecords === e.totalRecords && e.totalRecords > 0
  ).length;

  return [
    { label: 'Total', count: total },
    { label: 'Needs Attention', count: needsAttention, highlight: needsAttention > 0 },
    { label: 'In Progress', count: inProgress },
    { label: 'Complete', count: complete },
  ];
}

export function StatusSummaryBar({ exercises }: StatusSummaryBarProps) {
  const stats = computeStats(exercises);

  return (
    <div className="flex gap-3 px-6 py-3 bg-forge-950 border-b border-forge-800">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={[
            'px-3 py-1.5 rounded-md bg-forge-850 border',
            stat.highlight ? 'border-amber-500/30' : 'border-forge-750',
          ].join(' ')}
        >
          <span className="text-sm font-semibold text-forge-100">{stat.count}</span>
          <span className="ml-1.5 text-xs font-medium text-forge-300">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] Verify types compile:

```bash
cd client && npx tsc --noEmit
# Expected: 0 errors
```

**Commit:** `feat: add StatusSummaryBar component for business dashboard`

---

## Task 9: Business Dashboard - ExerciseCard

**Goal:** Build the ExerciseCard with progress, column stats, deadline indicator, and CTA button.

### Files

| Action | Path |
|--------|------|
| Create | `client/src/components/dashboard/DeadlineIndicator.tsx` |
| Create | `client/src/components/dashboard/ExerciseCard.tsx` |

### Steps

- [ ] Create `client/src/components/dashboard/DeadlineIndicator.tsx`:

```typescript
import { Calendar } from 'lucide-react';

interface DeadlineIndicatorProps {
  deadline: string | null;
}

export function DeadlineIndicator({ deadline }: DeadlineIndicatorProps) {
  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let text: string;
  let colorClass: string;

  if (diffDays < 0) {
    text = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    colorClass = 'text-status-error';
  } else if (diffDays <= 7) {
    text = `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    colorClass = 'text-amber-400';
  } else {
    text = `Due ${deadlineDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`;
    colorClass = 'text-forge-400';
  }

  return (
    <div className={['flex items-center gap-1 text-xs', colorClass].join(' ')}>
      <Calendar size={12} />
      <span>{text}</span>
    </div>
  );
}
```

- [ ] Create `client/src/components/dashboard/ExerciseCard.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ExerciseListItem } from '@mapforge/shared';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Button } from '@/components/common/Button';
import { DeadlineIndicator } from './DeadlineIndicator';

interface ExerciseCardProps {
  exercise: ExerciseListItem;
}

function getStatusVariant(status: ExerciseListItem['status']) {
  switch (status) {
    case 'active':
      return 'clean' as const;
    case 'paused':
      return 'warning' as const;
    case 'draft':
      return 'outline' as const;
    case 'archived':
      return 'default' as const;
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function getColumnPercentageColor(percentage: number): string {
  if (percentage >= 100) return 'text-status-clean';
  if (percentage >= 50) return 'text-amber-400';
  return 'text-forge-400';
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const navigate = useNavigate();
  const percentage =
    exercise.totalRecords > 0
      ? Math.round((exercise.classifiedRecords / exercise.totalRecords) * 100)
      : 0;
  const hasStarted = exercise.classifiedRecords > 0;

  return (
    <Card
      hover
      glow="amber"
      padding="md"
      onClick={() => navigate(`/exercises/${exercise.id}`)}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(exercise.status)}>
            {exercise.status.charAt(0).toUpperCase() + exercise.status.slice(1)}
          </Badge>
          {exercise.hasNewRecords && (
            <Badge variant="cyan">{exercise.newRecordCount} New Records</Badge>
          )}
        </div>
        <DeadlineIndicator deadline={exercise.deadline} />
      </div>

      {/* Title and description */}
      <h3 className="text-lg font-semibold text-forge-50 mt-2">{exercise.name}</h3>
      <p className="text-sm text-forge-400 mt-1 line-clamp-2">{exercise.description}</p>

      {/* Progress bar */}
      <div className="mt-4">
        <ProgressBar
          value={exercise.classifiedRecords}
          max={exercise.totalRecords}
          variant="amber"
          label={`${exercise.classifiedRecords} of ${exercise.totalRecords} (${percentage}%)`}
          showPercentage={false}
        />
      </div>

      {/* Column breakdown */}
      {exercise.columnStats.length > 0 && (
        <div className="flex gap-4 mt-2">
          {exercise.columnStats.map((stat) => (
            <span key={stat.columnKey} className="text-xs text-forge-400">
              {stat.label}:{' '}
              <span className={getColumnPercentageColor(stat.percentage)}>
                {stat.percentage}%
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-forge-800">
        <span className="text-xs text-forge-500">
          {hasStarted
            ? `Last active: ${formatRelativeTime(exercise.lastUpdatedAt)}`
            : 'Not started'}
        </span>
        <Button
          variant="primary"
          size="sm"
          icon={<ArrowRight size={14} />}
          iconPosition="right"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/exercises/${exercise.id}`);
          }}
        >
          {hasStarted ? 'Continue Classifying' : 'Start Classifying'}
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] Verify types compile:

```bash
cd client && npx tsc --noEmit
# Expected: 0 errors
```

**Commit:** `feat: add ExerciseCard and DeadlineIndicator components`

---

## Task 10: Business Dashboard - Page Assembly

**Goal:** Wire up the full BusinessDashboardPage with loading, empty, and error states. Includes sort logic (errors first, then deadline, then name).

### Files

| Action | Path |
|--------|------|
| Modify | `client/src/pages/BusinessDashboardPage.tsx` |
| Modify | `client/src/App.tsx` (add exercises route) |

### Steps

- [ ] Replace `client/src/pages/BusinessDashboardPage.tsx`:

```typescript
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusSummaryBar } from '@/components/dashboard/StatusSummaryBar';
import { ExerciseCard } from '@/components/dashboard/ExerciseCard';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/common/Card';
import { useMyExercises } from '@/hooks/useExercises';
import type { ExerciseListItem } from '@mapforge/shared';

function sortExercises(exercises: ExerciseListItem[]): ExerciseListItem[] {
  return [...exercises].sort((a, b) => {
    // Errors first
    if (a.errorCount > 0 && b.errorCount === 0) return -1;
    if (a.errorCount === 0 && b.errorCount > 0) return 1;

    // Then by deadline (nulls last)
    if (a.deadline && b.deadline) {
      const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (diff !== 0) return diff;
    }
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;

    // Then by name
    return a.name.localeCompare(b.name);
  });
}

function SkeletonCard() {
  return (
    <Card padding="md">
      <div className="animate-pulse space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-forge-850 rounded" />
          <div className="h-5 w-24 bg-forge-850 rounded" />
        </div>
        <div className="h-6 w-3/4 bg-forge-850 rounded" />
        <div className="h-4 w-1/2 bg-forge-850 rounded" />
        <div className="h-2.5 w-full bg-forge-850 rounded-full mt-4" />
        <div className="flex justify-between pt-3 border-t border-forge-800">
          <div className="h-4 w-24 bg-forge-850 rounded" />
          <div className="h-8 w-36 bg-forge-850 rounded" />
        </div>
      </div>
    </Card>
  );
}

export function BusinessDashboardPage() {
  const { data: exercises, isLoading, isError, refetch } = useMyExercises();

  // Loading state
  if (isLoading) {
    return (
      <AppLayout title="My Assignments">
        <div className="p-6 space-y-4 max-w-3xl mx-auto">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (isError) {
    return (
      <AppLayout title="My Assignments">
        <div className="p-6 max-w-3xl mx-auto">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-status-error shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-forge-100">
                  Failed to load exercises
                </p>
                <p className="text-xs text-forge-400 mt-0.5">
                  There was a problem fetching your assignments. Please try again.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Empty state
  if (!exercises || exercises.length === 0) {
    return (
      <AppLayout title="My Assignments">
        <EmptyState
          icon={<ClipboardList size={48} />}
          heading="No exercises assigned"
          body="Contact your administrator to get assigned to an enrichment exercise."
        />
      </AppLayout>
    );
  }

  const sorted = sortExercises(exercises);

  return (
    <AppLayout title="My Assignments">
      <StatusSummaryBar exercises={exercises} />
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        {sorted.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </AppLayout>
  );
}
```

- [ ] Update `client/src/App.tsx` to add the exercises route placeholder:

```typescript
// Add to the Routes inside App.tsx:
<Route
  path="/exercises/:exerciseId"
  element={
    <ProtectedRoute allowedRoles={['user']}>
      <div className="p-8 text-forge-300">Enrichment Spreadsheet placeholder (Phase 2)</div>
    </ProtectedRoute>
  }
/>
```

- [ ] Verify the dashboard renders correctly with mock data by temporarily wiring up the mock in the hook. Create a development override:

To test without a backend, temporarily modify `useMyExercises` to return mock data:

```typescript
// Temporary test -- revert after verifying
import { useQuery } from '@tanstack/react-query';
import { mockExercises } from '@/mocks/exercises';

export function useMyExercises() {
  return useQuery({
    queryKey: ['my-exercises'],
    queryFn: async () => mockExercises,
    staleTime: 30_000,
  });
}
```

- [ ] Verify in browser:

```bash
npm run dev:client
# Navigate to http://localhost:5173/login
# Sign in as user@test.com
# Dashboard should show:
#   - TopBar with "My Assignments"
#   - StatusSummaryBar with 4 pills: 3 Total, 1 Needs Attention, 1 In Progress, 1 Complete
#   - 3 ExerciseCards sorted: "Development Programming" first (has errors), then "Draft Ranking Weights" (earlier deadline), then "Scouting Event Classification"
#   - Each card shows progress bar, column stats, deadline, CTA button
```

- [ ] Revert `useMyExercises` back to use the real `fetchMyExercises` API call.

**Commit:** `feat: assemble BusinessDashboardPage with loading, empty, error states, and sort logic`

---

## Task 11: Server - Exercise API Endpoint

**Goal:** Create the Drizzle schema, the GET `/api/v1/exercises` endpoint, and basic auth middleware.

### Files

| Action | Path |
|--------|------|
| Create | `server/src/db/schema.ts` |
| Create | `server/src/db/connection.ts` |
| Create | `server/src/middleware/auth.ts` |
| Create | `server/src/routes/exercises.ts` |
| Modify | `server/src/index.ts` |
| Create | `server/drizzle.config.ts` |
| Create | `.env.example` |

### Steps

- [ ] Create `.env.example` at the project root:

```
DATABASE_URL=postgresql://mapforge:mapforge@localhost:5432/mapforge
JWT_SECRET=dev-secret-change-in-production
PORT=3001
```

- [ ] Create `server/src/db/schema.ts`:

```typescript
import { pgTable, uuid, text, varchar, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const exerciseStatusEnum = pgEnum('exercise_status', ['draft', 'active', 'paused', 'archived']);
export const columnRoleEnum = pgEnum('column_role', ['source', 'classification', 'computed']);
export const columnDataTypeEnum = pgEnum('column_data_type', ['text', 'number', 'date', 'boolean', 'picklist', 'multi_select']);
export const recordStateEnum = pgEnum('record_state', ['new', 'existing', 'changed', 'removed']);
export const assignmentRoleEnum = pgEnum('assignment_role', ['editor', 'viewer']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const enrichmentExercises = pgTable('enrichment_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  status: exerciseStatusEnum('status').notNull().default('draft'),
  deadline: timestamp('deadline'),
  createdBy: uuid('created_by').references(() => users.id),
  lastRefreshedAt: timestamp('last_refreshed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const exerciseColumns = pgTable('exercise_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  exerciseId: uuid('exercise_id').references(() => enrichmentExercises.id).notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  description: text('description'),
  dataType: columnDataTypeEnum('data_type').notNull().default('text'),
  columnRole: columnRoleEnum('column_role').notNull(),
  required: boolean('required').notNull().default(false),
  defaultValue: text('default_value'),
  config: jsonb('config').notNull().default({}),
  validationRules: jsonb('validation_rules').notNull().default([]),
  referenceLink: jsonb('reference_link'),
  dependentConfig: jsonb('dependent_config'),
  visible: boolean('visible').notNull().default(true),
  ordinal: integer('ordinal').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userExerciseAssignments = pgTable('user_exercise_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  exerciseId: uuid('exercise_id').references(() => enrichmentExercises.id).notNull(),
  role: assignmentRoleEnum('role').notNull().default('editor'),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
});

export const enrichmentRecords = pgTable('enrichment_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  exerciseId: uuid('exercise_id').references(() => enrichmentExercises.id).notNull(),
  uniqueKey: jsonb('unique_key').notNull(),
  sourceData: jsonb('source_data').notNull(),
  classifications: jsonb('classifications').notNull().default({}),
  recordState: recordStateEnum('record_state').notNull().default('new'),
  validationErrors: jsonb('validation_errors').notNull().default([]),
  isFullyClassified: boolean('is_fully_classified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

- [ ] Create `server/src/db/connection.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://mapforge:mapforge@localhost:5432/mapforge';
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

- [ ] Create `server/drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://mapforge:mapforge@localhost:5432/mapforge',
  },
});
```

- [ ] Create `server/src/middleware/auth.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '@mapforge/shared';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { message: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' } });
    return;
  }

  const token = authHeader.slice(7);

  // TODO: Replace with real JWT verification
  // For development, accept the mock token and extract user from a header or decode JWT
  if (token === 'mock-jwt-token') {
    req.user = {
      id: 'user-1',
      orgId: 'org-1',
      email: 'user@test.com',
      name: 'Test User',
      role: 'user',
      avatarUrl: null,
    };
    next();
    return;
  }

  res.status(401).json({ error: { message: 'Invalid token', code: 'UNAUTHORIZED' } });
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } });
      return;
    }

    next();
  };
}
```

- [ ] Create `server/src/routes/exercises.ts`:

```typescript
import { Router } from 'express';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { enrichmentExercises, exerciseColumns, userExerciseAssignments, enrichmentRecords } from '../db/schema';
import { authMiddleware, requireRole } from '../middleware/auth';
import type { ExerciseListItem, ColumnStat } from '@mapforge/shared';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/exercises -- list exercises for the authenticated user
router.get('/', requireRole('user'), async (req, res) => {
  try {
    const userId = req.user!.id;

    // Find exercises assigned to this user
    const assignments = await db
      .select({ exerciseId: userExerciseAssignments.exerciseId })
      .from(userExerciseAssignments)
      .where(eq(userExerciseAssignments.userId, userId));

    if (assignments.length === 0) {
      res.json({ exercises: [] });
      return;
    }

    const exerciseIds = assignments.map((a) => a.exerciseId);

    const exercises: ExerciseListItem[] = [];

    for (const exerciseId of exerciseIds) {
      // Fetch exercise
      const [exercise] = await db
        .select()
        .from(enrichmentExercises)
        .where(eq(enrichmentExercises.id, exerciseId));

      if (!exercise) continue;

      // Fetch records stats
      const [stats] = await db
        .select({
          totalRecords: sql<number>`count(*)::int`,
          classifiedRecords: sql<number>`count(*) filter (where ${enrichmentRecords.isFullyClassified} = true)::int`,
          errorCount: sql<number>`count(*) filter (where jsonb_array_length(${enrichmentRecords.validationErrors}) > 0)::int`,
          newRecordCount: sql<number>`count(*) filter (where ${enrichmentRecords.recordState} = 'new')::int`,
        })
        .from(enrichmentRecords)
        .where(eq(enrichmentRecords.exerciseId, exerciseId));

      // Fetch classification columns for column stats
      const classificationCols = await db
        .select()
        .from(exerciseColumns)
        .where(
          and(
            eq(exerciseColumns.exerciseId, exerciseId),
            eq(exerciseColumns.columnRole, 'classification')
          )
        );

      // Compute column stats
      const columnStats: ColumnStat[] = [];
      for (const col of classificationCols) {
        const [colStat] = await db
          .select({
            totalCount: sql<number>`count(*)::int`,
            filledCount: sql<number>`count(*) filter (where (${enrichmentRecords.classifications}->>${sql.raw(`'${col.key}'`)}) is not null and (${enrichmentRecords.classifications}->>${sql.raw(`'${col.key}'`)}) != '')::int`,
          })
          .from(enrichmentRecords)
          .where(eq(enrichmentRecords.exerciseId, exerciseId));

        const total = colStat?.totalCount ?? 0;
        const filled = colStat?.filledCount ?? 0;
        columnStats.push({
          columnKey: col.key,
          label: col.label,
          filledCount: filled,
          totalCount: total,
          percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
        });
      }

      // Find the most recent record update for lastUpdatedAt
      const totalRecords = stats?.totalRecords ?? 0;
      const classifiedRecords = stats?.classifiedRecords ?? 0;
      const newRecordCount = stats?.newRecordCount ?? 0;

      exercises.push({
        id: exercise.id,
        name: exercise.name,
        description: exercise.description,
        status: exercise.status,
        totalRecords,
        classifiedRecords,
        errorCount: stats?.errorCount ?? 0,
        lastUpdatedAt: exercise.updatedAt.toISOString(),
        deadline: exercise.deadline ? exercise.deadline.toISOString() : null,
        hasNewRecords: newRecordCount > 0,
        newRecordCount,
        columnStats,
      });
    }

    // Sort: errors first, then deadline ASC (nulls last), then name ASC
    exercises.sort((a, b) => {
      if (a.errorCount > 0 && b.errorCount === 0) return -1;
      if (a.errorCount === 0 && b.errorCount > 0) return 1;

      if (a.deadline && b.deadline) {
        const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        if (diff !== 0) return diff;
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;

      return a.name.localeCompare(b.name);
    });

    res.json({ exercises });
  } catch (error) {
    console.error('Failed to fetch exercises:', error);
    res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
});

export { router as exercisesRouter };
```

- [ ] Update `server/src/index.ts` to mount the router:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exercisesRouter } from './routes/exercises';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/exercises', exercisesRouter);

app.listen(PORT, () => {
  console.log(`MapForge server running on port ${PORT}`);
});
```

- [ ] Verify the server compiles:

```bash
cd server && npx tsc --noEmit
# Expected: 0 errors (or minimal fixable issues)
```

**Commit:** `feat: add Drizzle schema, auth middleware, and GET /api/v1/exercises endpoint`

---

## Task 12: Integration & Smoke Test

**Goal:** Wire frontend to backend, seed the database with test data, and verify the dashboard renders with real data from the API.

### Files

| Action | Path |
|--------|------|
| Create | `server/src/db/seed.ts` |
| Modify | `server/package.json` (add seed script) |
| Modify | `client/src/hooks/useExercises.ts` (ensure it uses real API) |

### Steps

- [ ] Create `server/src/db/seed.ts`:

```typescript
import { db } from './connection';
import { users, enrichmentExercises, exerciseColumns, userExerciseAssignments, enrichmentRecords } from './schema';

async function seed() {
  console.log('Seeding database...');

  // Create a test user
  const [testUser] = await db
    .insert(users)
    .values({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      orgId: 'org-00000000-0000-0000-0000-000000000001',
      email: 'user@test.com',
      name: 'Test User',
      role: 'user',
      passwordHash: 'not-a-real-hash',
    })
    .onConflictDoNothing()
    .returning();

  const userId = testUser?.id ?? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  // Create an exercise
  const [exercise] = await db
    .insert(enrichmentExercises)
    .values({
      orgId: 'org-00000000-0000-0000-0000-000000000001',
      name: 'Development Programming 2026',
      description: 'Classify program registrations by sport and category',
      status: 'active',
      deadline: new Date('2026-04-15T00:00:00.000Z'),
    })
    .returning();

  // Create columns
  await db.insert(exerciseColumns).values([
    {
      exerciseId: exercise.id,
      key: 'siteId',
      label: 'Site ID',
      dataType: 'text',
      columnRole: 'source',
      required: false,
      visible: true,
      ordinal: 0,
      config: {},
      validationRules: [],
    },
    {
      exerciseId: exercise.id,
      key: 'programId',
      label: 'Program ID',
      dataType: 'text',
      columnRole: 'source',
      required: false,
      visible: true,
      ordinal: 1,
      config: {},
      validationRules: [],
    },
    {
      exerciseId: exercise.id,
      key: 'programName',
      label: 'Program Name',
      dataType: 'text',
      columnRole: 'source',
      required: false,
      visible: true,
      ordinal: 2,
      config: {},
      validationRules: [],
    },
    {
      exerciseId: exercise.id,
      key: 'sportCategory',
      label: 'Sport Category',
      dataType: 'picklist',
      columnRole: 'classification',
      required: true,
      visible: true,
      ordinal: 3,
      config: { picklistValues: ['Baseball', 'Softball', 'Girls Baseball', 'Tee Ball', 'Coach Pitch'] },
      validationRules: [{ type: 'required', config: {}, severity: 'error', message: 'Sport Category is required' }],
    },
    {
      exerciseId: exercise.id,
      key: 'categorization',
      label: 'Categorization',
      dataType: 'picklist',
      columnRole: 'classification',
      required: true,
      visible: true,
      ordinal: 4,
      config: { picklistValues: ['Recreational', 'Competitive', 'Elite', 'Instructional', 'Camp'] },
      validationRules: [{ type: 'required', config: {}, severity: 'error', message: 'Categorization is required' }],
    },
  ]);

  // Assign user to exercise
  await db.insert(userExerciseAssignments).values({
    userId,
    exerciseId: exercise.id,
    role: 'editor',
  });

  // Create sample records (mix of classified and unclassified)
  const samplePrograms = [
    { siteId: '22044', programId: '3998508', programName: '2023 Girls Baseball', classified: true, sport: 'Girls Baseball', cat: 'Recreational' },
    { siteId: '22044', programId: '4036238', programName: '2023 World Series', classified: false, sport: null, cat: null },
    { siteId: '22044', programId: '3998628', programName: '2023 BREAKTHROUGH', classified: true, sport: 'Softball', cat: 'Competitive', hasError: true },
    { siteId: '22044', programId: '4100123', programName: '2024 MLB TOUR', classified: false, sport: null, cat: null, isNew: true },
    { siteId: '22044', programId: '3998701', programName: '2023 Spring Baseball', classified: true, sport: 'Baseball', cat: 'Recreational' },
    { siteId: '22045', programId: '4001234', programName: '2023 Fall Tee Ball', classified: true, sport: 'Tee Ball', cat: 'Instructional' },
    { siteId: '22045', programId: '4005678', programName: '2023 Summer Camp', classified: true, sport: 'Baseball', cat: 'Camp' },
    { siteId: '22045', programId: '4009012', programName: '2024 Coach Pitch Intro', classified: false, sport: null, cat: null },
  ];

  for (const prog of samplePrograms) {
    const classifications: Record<string, string | null> = {
      sportCategory: prog.sport,
      categorization: prog.cat,
    };

    await db.insert(enrichmentRecords).values({
      exerciseId: exercise.id,
      uniqueKey: { programId: prog.programId },
      sourceData: { siteId: prog.siteId, programId: prog.programId, programName: prog.programName },
      classifications,
      recordState: prog.isNew ? 'new' : 'existing',
      validationErrors: prog.hasError
        ? [{ columnKey: 'categorization', severity: 'error', message: 'Value "Competitive" may not apply to Softball programs', ruleType: 'relational' }]
        : [],
      isFullyClassified: prog.classified && !prog.hasError,
    });
  }

  console.log('Seed complete. Created:');
  console.log('  - 1 test user (user@test.com)');
  console.log('  - 1 exercise (Development Programming 2026)');
  console.log('  - 5 columns (3 source, 2 classification)');
  console.log('  - 8 sample records');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

- [ ] Add seed script to `server/package.json`:

```json
{
  "scripts": {
    "seed": "tsx src/db/seed.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push"
  }
}
```

- [ ] Update the `authMiddleware` in `server/src/middleware/auth.ts` to use the seeded user ID:

The mock token handler should set `id` to `'a1b2c3d4-e5f6-7890-abcd-ef1234567890'` to match the seeded user.

- [ ] Ensure `client/src/hooks/useExercises.ts` points to the real API (not mocks):

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchMyExercises } from '@/api/exercises';

export function useMyExercises() {
  return useQuery({
    queryKey: ['my-exercises'],
    queryFn: fetchMyExercises,
    staleTime: 30_000,
  });
}
```

- [ ] Integration smoke test procedure:

```bash
# 1. Ensure PostgreSQL is running locally with a "mapforge" database
createdb mapforge 2>/dev/null || true

# 2. Push the schema to the database
cd server && DATABASE_URL=postgresql://mapforge:mapforge@localhost:5432/mapforge npx drizzle-kit push

# 3. Seed the database
cd server && npm run seed

# 4. Start the full stack
cd .. && npm run dev

# 5. Open http://localhost:5173
# Sign in as user@test.com
# Expected: Dashboard shows 1 exercise card "Development Programming 2026"
#   - Status: Active
#   - Progress: 4 of 8 (50%) -- or similar based on seed data
#   - Column stats: Sport Category and Categorization percentages
#   - 1 record with errors, 1 new record
#   - StatusSummaryBar shows: 1 Total, 1 Needs Attention, 1 In Progress, 0 Complete
```

- [ ] Verify the full flow works:
  - Login redirects to /dashboard
  - Dashboard fetches from GET /api/v1/exercises
  - Exercise card renders with correct data
  - Clicking "Continue Classifying" navigates to /exercises/:id (placeholder)
  - NotificationBell and UserAvatar render in TopBar
  - Logout button works and redirects to /login

**Commit:** `feat: add database seed, wire frontend to backend, verify end-to-end dashboard`

---

## Summary

| Task | Description | Estimated Effort |
|------|-------------|-----------------|
| 1 | Project Scaffold | Medium |
| 2 | Shared Types | Small |
| 3 | Auth Context & Routing | Medium |
| 4 | API Client Layer | Small |
| 5 | Common Components | Large |
| 6 | Layout Components | Medium |
| 7 | React Query Hooks | Small |
| 8 | StatusSummaryBar | Small |
| 9 | ExerciseCard | Medium |
| 10 | Page Assembly | Medium |
| 11 | Server Exercise API | Large |
| 12 | Integration & Smoke Test | Medium |

**Total files created:** ~45
**Depends on (next phase):** Phase 2 (Enrichment Spreadsheet View) builds on top of this foundation.
