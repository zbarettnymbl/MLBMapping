import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WizardClassificationColumn } from '@mapforge/shared';

interface ColumnConfigPanelProps {
  column: WizardClassificationColumn;
  isNew: boolean;
  onSave: (column: WizardClassificationColumn) => void;
  onClose: () => void;
}

const DATA_TYPES = [
  'picklist',
  'multi_select',
  'text',
  'number',
  'date',
  'boolean',
] as const;

export function ColumnConfigPanel({
  column,
  isNew,
  onSave,
  onClose,
}: ColumnConfigPanelProps) {
  const [form, setForm] = useState({ ...column });
  const [picklistValues, setPicklistValues] = useState<string>(
    (column.config as Record<string, unknown>)?.picklistValues
      ? (
          (column.config as Record<string, unknown>).picklistValues as string[]
        ).join('\n')
      : ''
  );

  const handleSubmit = () => {
    const config: Record<string, unknown> = { ...form.config };
    if (form.dataType === 'picklist' || form.dataType === 'multi_select') {
      config.picklistValues = picklistValues
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    onSave({
      ...form,
      key: form.key || form.label.toLowerCase().replace(/\s+/g, '_'),
      config,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border-l border-border p-6 overflow-y-auto">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {isNew ? 'Add' : 'Edit'} Classification Column
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label *</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          {isNew && (
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="Auto-generated from label"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="h-20 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select
              value={form.dataType}
              onValueChange={(val) => setForm({ ...form, dataType: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm({ ...form, required: e.target.checked })}
              className="accent-primary"
            />
            <span className="text-sm text-foreground">Required</span>
          </label>
          <div className="space-y-2">
            <Label>Default Value</Label>
            <Input
              value={form.defaultValue || ''}
              onChange={(e) =>
                setForm({ ...form, defaultValue: e.target.value || null })
              }
            />
          </div>
          {(form.dataType === 'picklist' ||
            form.dataType === 'multi_select') && (
            <div className="space-y-2">
              <Label>Picklist Values (one per line)</Label>
              <Textarea
                value={picklistValues}
                onChange={(e) => setPicklistValues(e.target.value)}
                className="h-32 resize-none font-mono text-sm"
                placeholder="Value 1\nValue 2\nValue 3"
              />
              <p className="text-xs text-muted-foreground">
                Or link to a reference table in Step 6.
              </p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <Button className="flex-1" onClick={handleSubmit}>
              {isNew ? 'Add Column' : 'Save Changes'}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
