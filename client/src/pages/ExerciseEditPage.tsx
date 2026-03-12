import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useExerciseDetail } from '@/hooks/useExerciseEdit';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GeneralTab } from '@/components/exercise-edit/GeneralTab';
import { DataSourceTab } from '@/components/exercise-edit/DataSourceTab';
import { SchemaEditorGrid } from '@/components/exercise-edit/SchemaEditorGrid';
import '@/components/grid/grid.css';

export function ExerciseEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: exercise, isLoading, isError, refetch } = useExerciseDetail(id!);
  const [activeTab, setActiveTab] = useState('general');
  const [isDirty, setIsDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const handleTabChange = (newTab: string) => {
    if (isDirty) {
      setPendingTab(newTab);
    } else {
      setActiveTab(newTab);
    }
  };

  const confirmTabSwitch = () => {
    if (pendingTab) {
      setIsDirty(false);
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const cancelTabSwitch = () => {
    setPendingTab(null);
  };

  if (isLoading) {
    return (
      <AppLayout title="Edit Exercise">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !exercise) {
    return (
      <AppLayout title="Edit Exercise">
        <div className="text-center py-16">
          <p className="text-sm text-destructive mb-3">Failed to load exercise.</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Edit: ${exercise.name}`}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/exercises')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{exercise.name}</h1>
              <p className="text-sm text-muted-foreground">{exercise.description}</p>
            </div>
          </div>
          <Badge
            variant={
              exercise.status === 'active' ? 'success' :
              exercise.status === 'completed' ? 'secondary' :
              'outline'
            }
          >
            {exercise.status}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="datasource">Data Source</TabsTrigger>
            <TabsTrigger value="data-assignments">Data & Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab exerciseId={id!} exercise={exercise} onDirtyChange={setIsDirty} />
          </TabsContent>
          <TabsContent value="datasource">
            <DataSourceTab exerciseId={id!} onDirtyChange={setIsDirty} />
          </TabsContent>
          <TabsContent value="data-assignments" className="h-[calc(100vh-220px)]">
            <SchemaEditorGrid exerciseId={id!} exercise={exercise} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Unsaved changes - tab switch */}
      <ConfirmDialog
        open={!!pendingTab}
        onOpenChange={() => cancelTabSwitch()}
        title="Unsaved changes"
        description="You have unsaved changes. Discard them?"
        confirmLabel="Discard"
        variant="destructive"
        onConfirm={confirmTabSwitch}
      />

    </AppLayout>
  );
}
