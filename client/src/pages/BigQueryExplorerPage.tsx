// client/src/pages/BigQueryExplorerPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BigQuerySidebar } from '@/components/bigquery/BigQuerySidebar';
import { BigQueryTableView } from '@/components/bigquery/BigQueryTableView';
import { fetchCredentials } from '@/api/credentials';

export function BigQueryExplorerPage() {
  // Pre-check: do any credentials exist?
  const credentialsQuery = useQuery({
    queryKey: ['credentials'],
    queryFn: fetchCredentials,
  });

  const hasCredentials = credentialsQuery.data && credentialsQuery.data.length > 0;
  const isLoading = credentialsQuery.isLoading;

  // No credentials empty state
  if (!isLoading && !hasCredentials) {
    return (
      <AppLayout title="BigQuery Explorer">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <Database className="w-12 h-12 text-forge-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-forge-200 mb-2">No BigQuery credentials configured</h2>
            <p className="text-sm text-forge-500 mb-4">
              Add a GCP service account credential to start browsing BigQuery data.
            </p>
            <Link
              to="/credentials"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-forge-900 bg-amber-500 rounded hover:bg-amber-400 transition-colors"
            >
              Go to Credentials
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="BigQuery Explorer">
      <div className="flex h-full">
        <BigQuerySidebar />
        <BigQueryTableView />
      </div>
    </AppLayout>
  );
}
