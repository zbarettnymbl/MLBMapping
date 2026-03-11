import { useState } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import type { WizardValidationRule } from '@mapforge/shared';

export function Step5ValidationRules() {
  const { classificationColumns, validationRules, setValidationRules } = useExerciseWizardStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState<Partial<WizardValidationRule>>({
    type: 'cross_column', severity: 'error', message: '', targetColumnKey: '', config: {},
  });

  const requiredRules = classificationColumns.filter(c => c.required).map(c => ({
    id: `req-${c.key}`, type: 'required' as const, config: {},
    severity: 'error' as const, message: `${c.label} is required`, targetColumnKey: c.key,
  }));

  const handleAddRule = () => {
    if (!newRule.targetColumnKey || !newRule.message) return;
    const rule: WizardValidationRule = {
      id: `rule-${Date.now()}`, type: newRule.type || 'cross_column',
      config: newRule.config || {}, severity: newRule.severity || 'error',
      message: newRule.message, targetColumnKey: newRule.targetColumnKey,
    };
    setValidationRules([...validationRules, rule]);
    setNewRule({ type: 'cross_column', severity: 'error', message: '', targetColumnKey: '', config: {} });
    setShowAddForm(false);
  };

  const removeRule = (id: string) => {
    setValidationRules(validationRules.filter(r => r.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-forge-100">Validation Rules</h2>
        <button onClick={() => setShowAddForm(true)} className="px-3 py-1.5 bg-amber-500 text-forge-900 rounded-md text-sm font-medium hover:bg-amber-400">
          + Add Rule
        </button>
      </div>
      {requiredRules.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-forge-400">Auto-generated Required Field Rules</h3>
          {requiredRules.map(rule => (
            <div key={rule.id} className="flex items-center gap-3 p-3 bg-forge-800/50 border border-forge-700 rounded-md opacity-75">
              <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">error</span>
              <span className="text-forge-300 text-sm flex-1">{rule.message}</span>
              <span className="text-xs text-forge-500">auto</span>
            </div>
          ))}
        </div>
      )}
      {validationRules.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-forge-400">Custom Rules</h3>
          {validationRules.map(rule => (
            <div key={rule.id} className="flex items-center gap-3 p-3 bg-forge-800 border border-forge-700 rounded-md">
              <span className={`text-xs px-2 py-0.5 rounded ${rule.severity === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {rule.severity}
              </span>
              <span className="text-forge-200 text-sm flex-1">{rule.message}</span>
              <span className="text-xs text-forge-500">{rule.targetColumnKey}</span>
              <button onClick={() => removeRule(rule.id)} className="text-sm text-red-400 hover:text-red-300">Remove</button>
            </div>
          ))}
        </div>
      )}
      {showAddForm && (
        <div className="p-4 bg-forge-800 border border-forge-700 rounded-md space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-forge-300 mb-1">Type</label>
              <select value={newRule.type} onChange={(e) => setNewRule({ ...newRule, type: e.target.value as 'cross_column' | 'custom' })}
                className="w-full px-3 py-2 bg-forge-700 border border-forge-600 rounded text-forge-100 text-sm">
                <option value="cross_column">Cross-column</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-forge-300 mb-1">Severity</label>
              <select value={newRule.severity} onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as 'error' | 'warning' })}
                className="w-full px-3 py-2 bg-forge-700 border border-forge-600 rounded text-forge-100 text-sm">
                <option value="error">Error</option>
                <option value="warning">Warning</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-forge-300 mb-1">Target Column</label>
              <select value={newRule.targetColumnKey} onChange={(e) => setNewRule({ ...newRule, targetColumnKey: e.target.value })}
                className="w-full px-3 py-2 bg-forge-700 border border-forge-600 rounded text-forge-100 text-sm">
                <option value="">Select column...</option>
                {classificationColumns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-forge-300 mb-1">Error Message</label>
              <input type="text" value={newRule.message} onChange={(e) => setNewRule({ ...newRule, message: e.target.value })}
                className="w-full px-3 py-2 bg-forge-700 border border-forge-600 rounded text-forge-100 text-sm" placeholder="e.g., Categorization is required when Sport Category is set" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddRule} className="px-3 py-1.5 bg-amber-500 text-forge-900 rounded text-sm font-medium hover:bg-amber-400">Add</button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 bg-forge-700 text-forge-300 rounded text-sm hover:bg-forge-600">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
