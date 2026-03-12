import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ReferenceTableGrid } from '@/components/reference-tables/ReferenceTableGrid';
import { CreateReferenceTableModal } from '@/components/reference-tables/CreateReferenceTableModal';
import { useAuth } from '@/contexts/AuthContext';
import { fetchReferenceTables, deleteReferenceTable } from '@/api/reference-tables';
import { toast } from 'sonner';

export function ReferenceTablesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
            <p className="text-sm text-muted-foreground">
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
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-sm text-destructive mb-3">Failed to load reference tables.</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {!isLoading && !error && tables.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">No reference tables yet.</p>
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
              <Card key={table.id} className="hover:border-border/80 transition-all">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === table.id ? null : table.id)}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-foreground">{table.name}</h3>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-muted-foreground">
                      <span>{table.columns.length} column{table.columns.length !== 1 ? 's' : ''}</span>
                      <span>{table.rowCount} row{table.rowCount !== 1 ? 's' : ''}</span>
                      <span>Source: {table.refreshSource}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {isAdmin && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: table.id, name: table.name });
                        }}
                      >
                        Delete
                      </Button>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === table.id ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>
                {expanded === table.id && (
                  <CardContent className="border-t border-border/50">
                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground mb-3">
                        <p>Created: {new Date(table.createdAt).toLocaleDateString()}</p>
                        {table.description && <p className="mt-1">{table.description}</p>}
                      </div>
                      <ReferenceTableGrid table={table} />
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateReferenceTableModal open={showCreate} onClose={() => setShowCreate(false)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Reference Table"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove all rows and version history. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteReferenceTable(deleteTarget.id);
            queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
            toast.success(`Deleted "${deleteTarget.name}"`);
            setDeleteTarget(null);
          } catch {
            toast.error('Failed to delete reference table');
          } finally {
            setDeleting(false);
          }
        }}
      />
    </AppLayout>
  );
}
