import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAllExercises } from '../hooks/useAdmin';
import { AdminStatsBar } from '../components/dashboard/AdminStatsBar';
import { ExerciseTable } from '../components/dashboard/ExerciseTable';
import { ExerciseProgressDrawer } from '../components/dashboard/ExerciseProgressDrawer';
import { Button } from '@/components/ui/button';
import { AppLayout } from '../components/layout';

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'draft' | 'archived'>('active');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const { data: exercises, isLoading, isError, refetch } = useAllExercises();

  if (isLoading) {
    return (
      <AppLayout title="Admin Dashboard">
        <div className="flex-1 flex items-center justify-center h-full">
          <Loader2 className="h-10 w-10 animate-spin text-primary" data-testid="spinner" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout title="Admin Dashboard">
        <div className="flex-1 flex flex-col items-center justify-center h-full">
          <p className="text-sm text-destructive mb-3">Failed to load exercises.</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <AppLayout title="Admin Dashboard">
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">No exercises</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">No exercises found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Admin Dashboard">
      <div className="flex flex-col h-full">
        <AdminStatsBar exercises={exercises} />

        <div className="flex flex-1 transition-all duration-200">
          <ExerciseTable
            exercises={exercises}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
            selectedExerciseId={selectedExerciseId}
            onSelectExercise={setSelectedExerciseId}
          />

          {selectedExerciseId && (
            <ExerciseProgressDrawer
              exerciseId={selectedExerciseId}
              onClose={() => setSelectedExerciseId(null)}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
