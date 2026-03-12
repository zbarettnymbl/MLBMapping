import { useState } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
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
        <h2 className="text-xl font-semibold text-foreground">Validation Rules</h2>
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          + Add Rule
        </Button>
      </div>
      {requiredRules.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Auto-generated Required Field Rules</h3>
          {requiredRules.map(rule => (
            <div key={rule.id} className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-md opacity-75">
              <Badge variant="destructive" className="text-xs">error</Badge>
              <span className="text-muted-foreground text-sm flex-1">{rule.message}</span>
              <span className="text-xs text-muted-foreground">auto</span>
            </div>
          ))}
        </div>
      )}
      {validationRules.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Custom Rules</h3>
          {validationRules.map(rule => (
            <div key={rule.id} className="flex items-center gap-3 p-3 bg-muted border border-border rounded-md">
              <Badge
                variant={rule.severity === 'error' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {rule.severity}
              </Badge>
              <span className="text-foreground text-sm flex-1">{rule.message}</span>
              <span className="text-xs text-muted-foreground">{rule.targetColumnKey}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => removeRule(rule.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
      {showAddForm && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newRule.type}
                  onValueChange={(val) => setNewRule({ ...newRule, type: val as 'cross_column' | 'custom' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cross_column">Cross-column</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={newRule.severity}
                  onValueChange={(val) => setNewRule({ ...newRule, severity: val as 'error' | 'warning' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Target Column</Label>
                <Select
                  value={newRule.targetColumnKey}
                  onValueChange={(val) => setNewRule({ ...newRule, targetColumnKey: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classificationColumns.map(c => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Error Message</Label>
                <Input
                  value={newRule.message}
                  onChange={(e) => setNewRule({ ...newRule, message: e.target.value })}
                  placeholder="e.g., Categorization is required when Sport Category is set"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddRule}>Add</Button>
              <Button variant="secondary" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
