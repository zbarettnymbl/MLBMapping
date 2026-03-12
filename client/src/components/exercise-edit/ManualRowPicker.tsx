import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { ManualRowOverrides } from '@mapforge/shared';

const MAX_ENTRIES = 1000;

interface ManualRowPickerProps {
  overrides: ManualRowOverrides;
  onChange: (overrides: ManualRowOverrides) => void;
}

export function ManualRowPicker({ overrides, onChange }: ManualRowPickerProps) {
  const [includeInput, setIncludeInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');

  const totalCount = overrides.include.length + overrides.exclude.length;

  const addInclude = () => {
    const id = includeInput.trim();
    if (!id) return;
    if (totalCount >= MAX_ENTRIES) {
      toast.error(`Maximum ${MAX_ENTRIES} entries allowed`);
      return;
    }
    if (overrides.include.includes(id)) {
      toast.error('ID already in include list');
      return;
    }
    onChange({
      ...overrides,
      include: [...overrides.include, id],
      exclude: overrides.exclude.filter((e) => e !== id),
    });
    setIncludeInput('');
  };

  const addExclude = () => {
    const id = excludeInput.trim();
    if (!id) return;
    if (totalCount >= MAX_ENTRIES) {
      toast.error(`Maximum ${MAX_ENTRIES} entries allowed`);
      return;
    }
    if (overrides.exclude.includes(id)) {
      toast.error('ID already in exclude list');
      return;
    }
    onChange({
      ...overrides,
      exclude: [...overrides.exclude, id],
      include: overrides.include.filter((e) => e !== id),
    });
    setExcludeInput('');
  };

  const removeInclude = (id: string) => {
    onChange({ ...overrides, include: overrides.include.filter((e) => e !== id) });
  };

  const removeExclude = (id: string) => {
    onChange({ ...overrides, exclude: overrides.exclude.filter((e) => e !== id) });
  };

  return (
    <div className="space-y-4">
      {/* Include */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Include Row IDs</p>
        <div className="flex gap-2">
          <Input
            value={includeInput}
            onChange={(e) => setIncludeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addInclude()}
            placeholder="Enter row ID to include"
            className="h-8"
          />
          <Button variant="outline" size="sm" onClick={addInclude}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {overrides.include.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {overrides.include.map((id) => (
              <Badge key={id} variant="secondary" className="text-xs gap-1">
                {id}
                <button onClick={() => removeInclude(id)} className="ml-0.5 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Exclude */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Exclude Row IDs</p>
        <div className="flex gap-2">
          <Input
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExclude()}
            placeholder="Enter row ID to exclude"
            className="h-8"
          />
          <Button variant="outline" size="sm" onClick={addExclude}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {overrides.exclude.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {overrides.exclude.map((id) => (
              <Badge key={id} variant="destructive" className="text-xs gap-1">
                {id}
                <button onClick={() => removeExclude(id)} className="ml-0.5 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {totalCount} / {MAX_ENTRIES} entries used
      </p>
    </div>
  );
}
