import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllExercises } from '@/hooks/useAdmin';
import { AppLayout } from '@/components/layout';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/common/Button';

type Tab = 'active' | 'completed' | 'draft' | 'archived';

const STATUS_MAP: Record<Tab, string[]> = {
  active: ['active', 'in_progress'],
  completed: ['completed'],
  draft: ['draft'],
  archived: ['archived'],
};

export function ExercisesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const { data: exercises, isLoading, isError, refetch } = useAllExercises();

  const filtered = exercises?.filter((e) =>
    STATUS_MAP[activeTab].includes(e.status)
  ) ?? [];

  const counts: Record<Tab, number> = {
    active: exercises?.filter((e) => STATUS_MAP.active.includes(e.status)).length ?? 0,
    completed: exercises?.filter((e) => e.status === 'completed').length ?? 0,
    draft: exercises?.filter((e) => e.status === 'draft').length ?? 0,
    archived: exercises?.filter((e) => e.status === 'archived').length ?? 0,
  };

  const tabs: Tab[] = ['active', 'completed', 'draft', 'archived'];

  return (
    <AppLayout title="Exercises">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-forge-400">
              {exercises?.length ?? 0} total exercises
            </p>
          </div>
          <Button onClick={() => navigate('/exercises/new')}>
            + New Exercise
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-forge-700">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-forge-400 hover:text-forge-200'
              }`}
            >
              {tab}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab ? 'bg-amber-500/15 text-amber-400' : 'bg-forge-800 text-forge-500'
              }`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {isError && (
          <div className="text-center py-16">
            <p className="text-sm text-red-400 mb-3">Failed to load exercises.</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-forge-500 text-sm">
              {activeTab === 'draft'
                ? 'No draft exercises. Click "+ New Exercise" to create one.'
                : `No ${activeTab} exercises.`}
            </p>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((exercise) => (
              <div
                key={exercise.id}
                onClick={() => navigate(`/exercises/${exercise.id}`)}
                className="flex items-center justify-between p-4 bg-forge-800/50 border border-forge-700 rounded-lg hover:bg-forge-800 hover:border-forge-600 cursor-pointer transition-all"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-forge-100 truncate">{exercise.name}</h3>
                  {exercise.description && (
                    <p className="text-xs text-forge-400 mt-0.5 truncate">{exercise.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-6 ml-6 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-forge-500">Progress</p>
                    <p className="text-sm font-medium text-forge-200">{exercise.completionPercentage ?? 0}%</p>
                  </div>
                  {exercise.deadline && (
                    <div className="text-right">
                      <p className="text-xs text-forge-500">Deadline</p>
                      <p className="text-sm text-forge-300">
                        {new Date(exercise.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                  <span className={`text-xs px-2 py-1 rounded border ${
                    exercise.status === 'active' || exercise.status === 'in_progress'
                      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                      : exercise.status === 'completed'
                      ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                      : exercise.status === 'draft'
                      ? 'border-forge-600 text-forge-400 bg-forge-800'
                      : 'border-forge-700 text-forge-500 bg-forge-900'
                  }`}>
                    {exercise.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
