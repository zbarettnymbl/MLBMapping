import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAllExercises } from '@/hooks/useAdmin';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Tab = 'active' | 'completed' | 'draft' | 'archived';

const STATUS_MAP: Record<Tab, string[]> = {
  active: ['active', 'in_progress'],
  completed: ['completed'],
  draft: ['draft'],
  archived: ['archived'],
};

export function ExercisesPage() {
  const navigate = useNavigate();
  const { data: exercises, isLoading, isError, refetch } = useAllExercises();

  const counts: Record<Tab, number> = {
    active: exercises?.filter((e) => STATUS_MAP.active.includes(e.status)).length ?? 0,
    completed: exercises?.filter((e) => e.status === 'completed').length ?? 0,
    draft: exercises?.filter((e) => e.status === 'draft').length ?? 0,
    archived: exercises?.filter((e) => e.status === 'archived').length ?? 0,
  };

  const tabs: Tab[] = ['active', 'completed', 'draft', 'archived'];

  const getFilteredExercises = (tab: Tab) =>
    exercises?.filter((e) => STATUS_MAP[tab].includes(e.status)) ?? [];

  return (
    <AppLayout title="Exercises">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {exercises?.length ?? 0} total exercises
            </p>
          </div>
          <Button onClick={() => navigate('/exercises/new')}>
            + New Exercise
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="capitalize">
                {tab}
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {counts[tab]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Content */}
          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <div className="text-center py-16">
              <p className="text-sm text-destructive mb-3">Failed to load exercises.</p>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          )}

          {!isLoading && !isError && tabs.map((tab) => (
            <TabsContent key={tab} value={tab}>
              {getFilteredExercises(tab).length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-sm">
                    {tab === 'draft'
                      ? 'No draft exercises. Click "+ New Exercise" to create one.'
                      : `No ${tab} exercises.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getFilteredExercises(tab).map((exercise) => (
                    <div
                      key={exercise.id}
                      onClick={() => navigate(`/exercises/${exercise.id}`)}
                      className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-accent/50 hover:border-border/80 hover:shadow-md cursor-pointer transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-foreground truncate">{exercise.name}</h3>
                        {exercise.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{exercise.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-6 ml-6 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Progress</p>
                          <p className="text-sm font-medium text-foreground">{exercise.completionPercentage ?? 0}%</p>
                        </div>
                        {exercise.deadline && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Deadline</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(exercise.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        )}
                        <Badge
                          variant={
                            exercise.status === 'active' || exercise.status === 'in_progress'
                              ? 'success'
                              : exercise.status === 'completed'
                              ? 'secondary'
                              : exercise.status === 'draft'
                              ? 'outline'
                              : 'outline'
                          }
                        >
                          {exercise.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
