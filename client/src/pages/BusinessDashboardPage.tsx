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
