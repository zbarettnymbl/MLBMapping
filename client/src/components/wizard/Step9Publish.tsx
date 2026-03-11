import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { apiClient } from '@/api/client';

export function Step9Publish() {
  const navigate = useNavigate();
  const store = useExerciseWizardStore();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const handlePublish = async () => {
    if (!store.exerciseId) { setError('No exercise created'); return; }
    setPublishing(true); setError('');
    try {
      // Save columns
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

      // Save assignments
      for (const assignment of store.userAssignments) {
        await apiClient.post(`/exercises/${store.exerciseId}/assignments`, {
          userId: assignment.userId, role: assignment.role,
        });
      }

      // Save deadline if set
      if (store.deadline) {
        await apiClient.put(`/exercises/${store.exerciseId}`, { deadline: store.deadline });
      }

      // Publish
      await apiClient.post(`/exercises/${store.exerciseId}/publish`);
      store.reset();
      navigate('/admin');
    } catch (err) {
      setError('Failed to publish exercise. Please try again.');
    } finally { setPublishing(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-forge-100">Review & Publish</h2>
      <div className="space-y-4">
        <div className="p-4 bg-forge-800 border border-forge-700 rounded-md">
          <h3 className="text-sm font-medium text-forge-400 mb-2">Exercise</h3>
          <p className="text-forge-100 font-medium">{store.exerciseInfo.name}</p>
          {store.exerciseInfo.description && <p className="text-forge-300 text-sm mt-1">{store.exerciseInfo.description}</p>}
          <p className="text-forge-500 text-xs mt-1">Mode: {store.exerciseInfo.viewMode}</p>
        </div>
        <div className="p-4 bg-forge-800 border border-forge-700 rounded-md">
          <h3 className="text-sm font-medium text-forge-400 mb-2">Data Source</h3>
          {store.dataSource.connectionConfig ? (
            <div className="text-sm text-forge-200">
              <p>{store.dataSource.connectionConfig.gcpProject} / {store.dataSource.connectionConfig.dataset}</p>
              <p className="text-forge-400">{store.dataSource.connectionConfig.queryType}: {store.dataSource.connectionConfig.tableOrQuery}</p>
            </div>
          ) : <p className="text-forge-500 text-sm">Not configured</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-forge-800 border border-forge-700 rounded-md">
            <h3 className="text-sm font-medium text-forge-400 mb-1">Source Columns</h3>
            <p className="text-2xl font-bold text-forge-100">{store.sourceColumns.filter(c => c.visible).length}</p>
            <p className="text-xs text-forge-500">{store.sourceColumns.length} total, {store.sourceColumns.filter(c => !c.visible).length} hidden</p>
          </div>
          <div className="p-4 bg-forge-800 border border-forge-700 rounded-md">
            <h3 className="text-sm font-medium text-forge-400 mb-1">Classification Columns</h3>
            <p className="text-2xl font-bold text-forge-100">{store.classificationColumns.length}</p>
            <p className="text-xs text-forge-500">{store.classificationColumns.filter(c => c.required).length} required</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-forge-800 border border-forge-700 rounded-md">
            <h3 className="text-sm font-medium text-forge-400 mb-1">Validation Rules</h3>
            <p className="text-2xl font-bold text-forge-100">{store.validationRules.length + store.classificationColumns.filter(c => c.required).length}</p>
          </div>
          <div className="p-4 bg-forge-800 border border-forge-700 rounded-md">
            <h3 className="text-sm font-medium text-forge-400 mb-1">Assigned Users</h3>
            <p className="text-2xl font-bold text-forge-100">{store.userAssignments.length}</p>
            {store.deadline && <p className="text-xs text-forge-500">Deadline: {store.deadline}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {store.uniqueKeyColumns.length > 0 && (
            <span className="text-xs text-forge-500">Unique keys: {store.uniqueKeyColumns.join(', ')}</span>
          )}
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={handlePublish} disabled={publishing || !store.exerciseId}
        className="w-full px-6 py-3 bg-amber-500 text-forge-900 rounded-md font-semibold text-lg hover:bg-amber-400 disabled:opacity-50">
        {publishing ? 'Publishing...' : 'Publish Exercise'}
      </button>
    </div>
  );
}
