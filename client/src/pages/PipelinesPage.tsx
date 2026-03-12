import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { RunStatusBadge } from '@/components/pipeline/RunStatusBadge';
import { fetchPipelines, deletePipeline } from '@/api/pipelines';
import type { PipelineListItem } from '@mapforge/shared';

export function PipelinesPage() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<PipelineListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPipelines();
      setPipelines(data);
    } catch {
      setError('Failed to load pipelines.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete pipeline "${name}"?`)) return;
    try {
      await deletePipeline(id);
      setPipelines((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <AppLayout title="Pipelines">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''}
          </p>
          <Button onClick={() => navigate('/pipelines/new')}>
            + New Pipeline
          </Button>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="ghost" size="sm" onClick={load}>Retry</Button>
          </div>
        )}

        {!loading && !error && pipelines.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">No pipelines yet.</p>
            <p className="text-muted-foreground text-xs">Create a pipeline to automate data flows between BigQuery, exercises, and enrichment steps.</p>
            <Button onClick={() => navigate('/pipelines/new')} size="sm">
              Create your first pipeline
            </Button>
          </div>
        )}

        {!loading && !error && pipelines.length > 0 && (
          <div className="space-y-2">
            {pipelines.map((pipeline) => (
              <div
                key={pipeline.id}
                className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg hover:bg-muted hover:border-border transition-all group"
              >
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => navigate(`/pipelines/${pipeline.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-foreground">{pipeline.name}</h3>
                    <RunStatusBadge status={pipeline.status} />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{pipeline.nodeCount} node{pipeline.nodeCount !== 1 ? 's' : ''}</span>
                    <span>{pipeline.triggerType === 'manual' ? 'Manual trigger' : `Scheduled: ${pipeline.triggerType}`}</span>
                    {pipeline.lastRunAt && (
                      <span>Last run: {new Date(pipeline.lastRunAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/pipelines/${pipeline.id}`)}
                    className="h-7 px-2.5 text-xs"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/pipelines/${pipeline.id}/runs`)}
                    className="h-7 px-2.5 text-xs"
                  >
                    Runs
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(pipeline.id, pipeline.name)}
                    className="h-7 px-2.5 text-xs"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
