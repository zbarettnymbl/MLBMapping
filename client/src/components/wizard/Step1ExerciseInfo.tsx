import { useState } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { apiClient } from '@/api/client';

export function Step1ExerciseInfo() {
  const { exerciseInfo, setExerciseInfo, setExerciseId, exerciseId, nextStep } =
    useExerciseWizardStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!exerciseInfo.name.trim()) {
      setError('Exercise name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (!exerciseId) {
        const response = await apiClient.post('/exercises', {
          name: exerciseInfo.name,
          description: exerciseInfo.description,
          viewMode: exerciseInfo.viewMode,
        });
        setExerciseId(response.data.id);
      } else {
        await apiClient.put(`/exercises/${exerciseId}`, {
          name: exerciseInfo.name,
          description: exerciseInfo.description,
          viewMode: exerciseInfo.viewMode,
        });
      }
      nextStep();
    } catch {
      setError('Failed to save exercise');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-forge-100">
        Exercise Information
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-forge-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={exerciseInfo.name}
            onChange={(e) => setExerciseInfo({ name: e.target.value })}
            className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100 focus:border-amber-500 focus:outline-none"
            placeholder="e.g., Development Programming 2026"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-forge-300 mb-1">
            Description
          </label>
          <textarea
            value={exerciseInfo.description}
            onChange={(e) => setExerciseInfo({ description: e.target.value })}
            className="w-full px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100 focus:border-amber-500 focus:outline-none h-24 resize-none"
            placeholder="Describe the purpose of this exercise..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-forge-300 mb-2">
            View Mode
          </label>
          <div className="flex gap-4">
            {(['flat', 'matrix'] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="viewMode"
                  value={mode}
                  checked={exerciseInfo.viewMode === mode}
                  onChange={() => setExerciseInfo({ viewMode: mode })}
                  className="text-amber-500 focus:ring-amber-500"
                />
                <span className="text-forge-200 capitalize">{mode}</span>
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-amber-500 text-forge-900 rounded-md font-medium hover:bg-amber-400 disabled:opacity-50"
        >
          {saving
            ? 'Saving...'
            : exerciseId
              ? 'Update & Continue'
              : 'Create & Continue'}
        </button>
      </div>
    </div>
  );
}
