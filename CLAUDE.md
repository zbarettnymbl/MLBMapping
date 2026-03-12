# MapForge - CLAUDE.md

## Overview
MapForge is a full-stack platform for MLB's Baseball & Softball Development analytics team. It replaces manual Google Sheets workflows with a structured, multi-user system for enriching, classifying, and managing data from BigQuery. Features include a spreadsheet-style classification UI, pipeline builder, admin dashboard, and round-trip BigQuery sync.

## Tech Stack
- **Monorepo**: npm workspaces (`client/`, `server/`, `shared/`)
- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS 4, Zustand 5, React Query 5, AG Grid 33, React Flow (@xyflow/react), React Router 7, lucide-react, react-hot-toast
- **Backend**: Express 5, TypeScript, Drizzle ORM, PostgreSQL 16, @google-cloud/bigquery, node-cron, multer
- **Shared**: TypeScript type definitions consumed by both client and server
- **Testing**: Vitest, @testing-library/react, MSW (client mocks), supertest (server)
- **Infrastructure**: Docker Compose (dev), AWS ECS Fargate (prod)

## Commands
```bash
# Development
npm run dev                  # Start client + server concurrently
npm run dev:client           # Client only (Vite on :5173)
npm run dev:server           # Server only (Express on :3001)
npm run dev:docker           # Docker Compose up
npm run dev:docker:build     # Docker Compose up --build
npm run dev:docker:clean     # Docker Compose down -v (removes volumes)

# Build
npm run build                # Build shared -> client -> server
npm run typecheck            # TypeScript check all workspaces

# Test
npm run test                 # Run all workspace tests
cd client && npx vitest run  # Client tests only
cd server && npx vitest run  # Server tests only

# Database
npm run db:seed              # Seed database
npm run db:seed:fresh        # Drop and reseed
```

## Project Structure
```
client/src/
  api/            # Axios-based API clients (exercises, admin, pipelines, bigquery, etc.)
  components/     # UI components (common/, dashboard/, grid/, layout/, pipeline/, wizard/)
  contexts/       # AuthContext (mock login, localStorage persistence)
  hooks/          # useExercises, useAutoSave, useDependentOptions, useAdmin
  pages/          # Route pages (Login, Dashboard, Spreadsheet, Admin, Wizard, Pipeline)
  stores/         # Zustand stores (pipelineStore, exerciseWizardStore, spreadsheetStore)
  types/          # Client-specific types
  mocks/          # MSW handlers for testing

server/src/
  db/             # schema.ts (Drizzle), connection.ts, seed.ts, seeds/
  middleware/     # auth.ts (JWT + mock tokens), requireAdmin.ts
  routes/         # exercises, admin, reference-tables, credentials, bigquery, pipelines
  services/       # bigquery, csv-import, pipeline-executor, pipeline-nodes/, source-sync, credentials

shared/src/
  types/          # exercise, pipeline, auth, admin, record, reference-table, wizard, api, credentials, bigquery, sync, classification
  index.ts        # Re-exports all types
```

## Coding Conventions
- TypeScript strict mode everywhere (tsconfig.base.json)
- Path alias: `@/` maps to `client/src/`
- Functional React components only; hooks for all state
- Zustand for client-side state management
- React Query for server state/caching
- AG Grid for spreadsheet/table UI
- React Flow for pipeline DAG builder
- Drizzle ORM for type-safe database access
- API routes prefixed with `/api/v1/`
- API responses: `{ status, data, message }` format
- 2-space indentation, ES modules throughout

## Authentication (Dev)
Mock auth in development:
- `mock-admin-token` and `mock-jwt-token` bypass JWT validation
- Login page assigns role based on email (contains "admin" = admin role)
- Auth state stored in localStorage, injected via Axios interceptor

## Database Schema (Key Tables)
- `organizations`, `users` (roles: admin | user)
- `enrichmentExercises`, `exerciseColumns` (columnRole: source | classification | computed)
- `sourceRecords`, `classificationValues`, `classificationHistory` (audit trail)
- `referenceTables`, `referenceTableRows`, `referenceTableVersions`
- `bigquerySources`, `bigqueryDestinations`, `storedCredentials`
- `pipelines`, `pipelineRuns`, `pipelineNodeRuns`
- `enrichmentRecords` (denormalized view for efficient queries)

## Environment Variables
Server requires `.env` (see `server/.env.example`):
- `DATABASE_URL` - PostgreSQL connection string (default port 5433 via Docker, 5432 direct)
- `PORT` - Server port (3001)
- `SESSION_SECRET` - Session signing key
- `CORS_ORIGIN` - Allowed origin (http://localhost:5173)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth (not yet implemented)
- `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_KEY_PATH` - BigQuery access

## Testing Patterns
- **Server**: Vitest + supertest; tests create isolated Express app, mock auth middleware
- **Client**: Vitest + jsdom + @testing-library/react; MSW for API mocking
- Test files live in `__tests__/` directories alongside source code

## Current Development
- **Branch**: `feat/phase2-full-implementation`
- **Phase 1**: Exercise CRUD, spreadsheet UI, admin dashboard (complete)
- **Phase 2**: Pipeline builder, node canvas, trigger scheduling (in progress)
- **Upcoming**: BigQuery integration, Google OAuth, GCP deployment
- Plans in `docs/superpowers/plans/`
