import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Step9Publish() {
  const navigate = useNavigate();
  const store = useExerciseWizardStore();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const handlePublish = async () => {
    if (!store.exerciseId) { setError('No exercise created'); return; }
    setPublishing(true); setError('');
    try {
      const allColumns = [
        ...store.sourceColumns.map(c => ({
          key: c.key, label: c.label, dataType: 'text', columnRole: 'source',
          ordinal: c.ordinal, visible: c.visible, required: false,
        })),
        ...store.classificationColumns.map(c => ({
          key: c.key, label: c.label, description: c.description, dataType: c.dataType,
          columnRole: 'classification', ordinal: c.ordinal + store.sourceColumns.length,
          required: c.required, defaultValue: c.defaultValue, config: c.config,
          referenceLink: c.referenceLink, dependentConfig: c.dependentConfig, visible: true,
        })),
      ];
      await apiClient.post(`/exercises/${store.exerciseId}/columns`, { columns: allColumns });

      for (const assignment of store.userAssignments) {
        await apiClient.post(`/exercises/${store.exerciseId}/assignments`, {
          userId: assignment.userId, role: assignment.role,
        });
      }

      if (store.deadline) {
        await apiClient.put(`/exercises/${store.exerciseId}`, { deadline: store.deadline });
      }

      await apiClient.post(`/exercises/${store.exerciseId}/publish`);
      store.reset();
      navigate('/admin');
    } catch {
      setError('Failed to publish exercise. Please try again.');
    } finally { setPublishing(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Review & Publish</h2>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground font-medium">{store.exerciseInfo.name}</p>
            {store.exerciseInfo.description && <p className="text-muted-foreground text-sm mt-1">{store.exerciseInfo.description}</p>}
            <p className="text-muted-foreground text-xs mt-1">Mode: {store.exerciseInfo.viewMode}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            {store.dataSource.connectionConfig ? (
              <div className="text-sm text-foreground">
                <p>{store.dataSource.connectionConfig.gcpProject} / {store.dataSource.connectionConfig.dataset}</p>
                <p className="text-muted-foreground">{store.dataSource.connectionConfig.queryType}: {store.dataSource.connectionConfig.tableOrQuery}</p>
              </div>
            ) : <p className="text-muted-foreground text-sm">Not configured</p>}
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Source Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{store.sourceColumns.filter(c => c.visible).length}</p>
              <p className="text-xs text-muted-foreground">{store.sourceColumns.length} total, {store.sourceColumns.filter(c => !c.visible).length} hidden</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Classification Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{store.classificationColumns.length}</p>
              <p className="text-xs text-muted-foreground">{store.classificationColumns.filter(c => c.required).length} required</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Validation Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{store.validationRules.length + store.classificationColumns.filter(c => c.required).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{store.userAssignments.length}</p>
              {store.deadline && <p className="text-xs text-muted-foreground">Deadline: {store.deadline}</p>}
            </CardContent>
          </Card>
        </div>
        <div className="flex items-center gap-2">
          {store.uniqueKeyColumns.length > 0 && (
            <span className="text-xs text-muted-foreground">Unique keys: {store.uniqueKeyColumns.join(', ')}</span>
          )}
        </div>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        className="w-full"
        size="lg"
        onClick={handlePublish}
        disabled={publishing || !store.exerciseId}
        isLoading={publishing}
      >
        {publishing ? 'Publishing...' : 'Publish Exercise'}
      </Button>
    </div>
  );
}
