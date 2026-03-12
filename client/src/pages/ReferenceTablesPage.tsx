import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { ReferenceTableGrid } from '@/components/reference-tables/ReferenceTableGrid';
import { CreateReferenceTableModal } from '@/components/reference-tables/CreateReferenceTableModal';
import { useAuth } from '@/contexts/AuthContext';
import { fetchReferenceTables, deleteReferenceTable } from '@/api/reference-tables';
import toast from 'react-hot-toast';

export function ReferenceTablesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: tables = [], isLoading, error, refetch } = useQuery({
    queryKey: ['reference-tables'],
    queryFn: fetchReferenceTables,
    staleTime: 30_000,
  });

  return (
    <AppLayout title="Reference Tables">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-forge-400">
              Managed lookup tables for picklist columns and validation. {tables.length} table{tables.length !== 1 ? 's' : ''}.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
              Create Reference Table
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-sm text-red-400 mb-3">Failed to load reference tables.</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {!isLoading && !error && tables.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-lg bg-forge-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-forge-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
              </svg>
            </div>
            <p className="text-forge-400 text-sm">No reference tables yet.</p>
            {isAdmin && (
              <Button size="sm" variant="secondary" onClick={() => setShowCreate(true)}>
                Create your first reference table
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && tables.length > 0 && (
          <div className="space-y-2">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-forge-800/50 border border-forge-700 rounded-lg hover:border-forge-600 transition-all"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === table.id ? null : table.id)}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-forge-100">{table.name}</h3>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-forge-500">
                      <span>{table.columns.length} column{table.columns.length !== 1 ? 's' : ''}</span>
                      <span>{table.rowCount} row{table.rowCount !== 1 ? 's' : ''}</span>
                      <span>Source: {table.refreshSource}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {isAdmin && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`Delete reference table "${table.name}"?`)) return;
                          try {
                            await deleteReferenceTable(table.id);
                            queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
                            toast.success(`Deleted "${table.name}"`);
                          } catch {
                            toast.error('Failed to delete reference table');
                          }
                        }}
                        className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                      >
                        Delete
                      </button>
                    )}
                    <svg
                      className={`w-4 h-4 text-forge-500 transition-transform ${expanded === table.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
                {expanded === table.id && (
                  <div className="px-4 pb-4 border-t border-forge-700/50">
                    <div className="mt-3">
                      <div className="text-xs text-forge-400 mb-3">
                        <p>Created: {new Date(table.createdAt).toLocaleDateString()}</p>
                        {table.description && <p className="mt-1">{table.description}</p>}
                      </div>
                      <ReferenceTableGrid table={table} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateReferenceTableModal open={showCreate} onClose={() => setShowCreate(false)} />
    </AppLayout>
  );
}
