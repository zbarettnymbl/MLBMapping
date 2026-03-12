// client/src/pages/__tests__/BigQueryExplorerPage.test.tsx
import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { BigQueryExplorerPage } from '../BigQueryExplorerPage';
import { useBigQueryExplorerStore } from '@/stores/bigqueryExplorerStore';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type { AuthUser } from '@mapforge/shared';

// Mock auth user matching the AuthUser shape
const mockUser: AuthUser = {
  id: '10000000-0000-4000-8000-000000000001',
  orgId: 'a1b2c3d4-0000-4000-8000-000000000001',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'admin',
  avatarUrl: null,
};

// MSW handlers
const handlers = [
  http.get('/api/v1/credentials', () => {
    return HttpResponse.json({
      credentials: [
        {
          id: 'cred-1',
          name: 'Test GCP Account',
          credentialType: 'gcp_service_account',
          createdAt: '2026-01-01',
          createdBy: 'admin',
        },
      ],
    });
  }),
  http.get('/api/v1/bigquery/datasets', () => {
    return HttpResponse.json({
      gcpProject: 'test-project',
      datasets: ['analytics', 'raw_data'],
    });
  }),
  http.get('/api/v1/bigquery/tables', ({ request }) => {
    const url = new URL(request.url);
    const dataset = url.searchParams.get('dataset');
    const tables = dataset === 'analytics' ? ['events', 'users'] : ['imports'];
    return HttpResponse.json({ tables });
  }),
  http.post('/api/v1/bigquery/schema', () => {
    return HttpResponse.json({
      columns: [
        { name: 'id', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'name', type: 'STRING', mode: 'NULLABLE' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
      ],
    });
  }),
  http.post('/api/v1/bigquery/preview', () => {
    return HttpResponse.json({
      columns: [
        { name: 'id', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'name', type: 'STRING', mode: 'NULLABLE' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
      ],
      rows: [
        { id: 1, name: 'Alice', created_at: '2026-01-01T00:00:00Z' },
        { id: 2, name: 'Bob', created_at: '2026-01-02T00:00:00Z' },
      ],
      totalRows: 2,
    });
  }),
];

const server = setupServer(...handlers);

// jsdom does not implement window.matchMedia; provide a stub
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  server.listen();
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Set mock auth in localStorage so AuthProvider picks it up on init
  localStorage.setItem('mapforge_token', 'mock-admin-token');
  localStorage.setItem('mapforge_user', JSON.stringify(mockUser));

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <BigQueryExplorerPage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BigQueryExplorerPage', () => {
  afterEach(() => {
    server.resetHandlers();
    useBigQueryExplorerStore.getState().reset();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('shows empty state when no credentials exist', async () => {
    server.use(
      http.get('/api/v1/credentials', () => {
        return HttpResponse.json({ credentials: [] });
      }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No BigQuery credentials configured')).toBeInTheDocument();
    });
    expect(screen.getByText('Go to Credentials')).toBeInTheDocument();
  });

  it('renders credential dropdown with options', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test GCP Account')).toBeInTheDocument();
    });
  });

  it('shows empty table state before selection', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Select a table from the sidebar to preview its data')).toBeInTheDocument();
    });
  });

  it('loads datasets when credential is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    // Wait for credentials to load, then select one
    await waitFor(() => {
      expect(screen.getByText('Test GCP Account')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'cred-1');

    // Datasets should load
    await waitFor(() => {
      expect(screen.getByText('analytics')).toBeInTheDocument();
      expect(screen.getByText('raw_data')).toBeInTheDocument();
    });
  });

  it('renders Export CSV button when table is selected', async () => {
    // Pre-set store state to simulate a table being selected
    const store = useBigQueryExplorerStore.getState();
    store.selectCredential('cred-1');
    store.setGcpProject('test-project');
    store.selectDataset('analytics');
    store.setSelectedTable('events');

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    // Export CSV button should be enabled once preview data loads
    await waitFor(() => {
      const exportBtn = screen.getByText('Export CSV').closest('button');
      expect(exportBtn).not.toBeDisabled();
    });
  });

  it('renders Create Exercise button that links to wizard', async () => {
    const store = useBigQueryExplorerStore.getState();
    store.selectCredential('cred-1');
    store.setGcpProject('test-project');
    store.selectDataset('analytics');
    store.setSelectedTable('events');

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Create Exercise')).toBeInTheDocument();
    });

    const createBtn = screen.getByText('Create Exercise').closest('button');
    expect(createBtn).toBeTruthy();
  });

  it('displays table header with dataset.table name', async () => {
    const store = useBigQueryExplorerStore.getState();
    store.selectCredential('cred-1');
    store.setGcpProject('test-project');
    store.selectDataset('analytics');
    store.setSelectedTable('events');

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('analytics.events')).toBeInTheDocument();
    });
  });
});
