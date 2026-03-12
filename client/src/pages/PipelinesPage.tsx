import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
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
          <p className="text-sm text-forge-400">
            {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''}
          </p>
          <Button onClick={() => navigate('/pipelines/new')}>
            + New Pipeline
          </Button>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <Button variant="ghost" size="sm" onClick={load}>Retry</Button>
          </div>
        )}

        {!loading && !error && pipelines.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-lg bg-forge-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-forge-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <p className="text-forge-400 text-sm">No pipelines yet.</p>
            <p className="text-forge-500 text-xs">Create a pipeline to automate data flows between BigQuery, exercises, and enrichment steps.</p>
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
                className="flex items-center justify-between p-4 bg-forge-800/50 border border-forge-700 rounded-lg hover:bg-forge-800 hover:border-forge-600 transition-all group"
              >
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => navigate(`/pipelines/${pipeline.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-forge-100">{pipeline.name}</h3>
                    <RunStatusBadge status={pipeline.status} />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-forge-500">
                    <span>{pipeline.nodeCount} node{pipeline.nodeCount !== 1 ? 's' : ''}</span>
                    <span>{pipeline.triggerType === 'manual' ? 'Manual trigger' : `Scheduled: ${pipeline.triggerType}`}</span>
                    {pipeline.lastRunAt && (
                      <span>Last run: {new Date(pipeline.lastRunAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/pipelines/${pipeline.id}`)}
                    className="px-2.5 py-1 text-xs text-forge-300 hover:text-forge-100 bg-forge-700 hover:bg-forge-600 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => navigate(`/pipelines/${pipeline.id}/runs`)}
                    className="px-2.5 py-1 text-xs text-forge-300 hover:text-forge-100 bg-forge-700 hover:bg-forge-600 rounded transition-colors"
                  >
                    Runs
                  </button>
                  <button
                    onClick={() => handleDelete(pipeline.id, pipeline.name)}
                    className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
