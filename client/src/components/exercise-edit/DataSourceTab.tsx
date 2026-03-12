import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSourceConfig, useSaveSourceConfig } from '@/hooks/useExerciseEdit';
import type { SourceConfig } from '@mapforge/shared';

interface DataSourceTabProps {
  exerciseId: string;
  onDirtyChange: (dirty: boolean) => void;
}

const EMPTY_CONFIG: SourceConfig = {
  gcpProject: '',
  dataset: '',
  tableOrQuery: '',
  queryType: 'table',
  credentialId: null,
  refreshSchedule: null,
};

export function DataSourceTab({ exerciseId, onDirtyChange }: DataSourceTabProps) {
  const { data: existingConfig, isLoading } = useSourceConfig(exerciseId);
  const saveConfig = useSaveSourceConfig(exerciseId);

  const [config, setConfig] = useState<SourceConfig>(EMPTY_CONFIG);
  const [initialConfig, setInitialConfig] = useState<SourceConfig>(EMPTY_CONFIG);

  useEffect(() => {
    if (existingConfig) {
      setConfig(existingConfig);
      setInitialConfig(existingConfig);
    }
  }, [existingConfig]);

  const isDirty = JSON.stringify(config) !== JSON.stringify(initialConfig);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateField = <K extends keyof SourceConfig>(key: K, value: SourceConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveConfig.mutate(config, {
      onSuccess: () => {
        setInitialConfig(config);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">BigQuery Source Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gcpProject">GCP Project</Label>
              <Input
                id="gcpProject"
                value={config.gcpProject}
                onChange={(e) => updateField('gcpProject', e.target.value)}
                placeholder="my-gcp-project"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset">Dataset</Label>
              <Input
                id="dataset"
                value={config.dataset}
                onChange={(e) => updateField('dataset', e.target.value)}
                placeholder="my_dataset"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="queryType">Query Type</Label>
            <Select
              value={config.queryType}
              onValueChange={(v) => updateField('queryType', v as 'table' | 'query')}
            >
              <SelectTrigger id="queryType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="query">Custom Query</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tableOrQuery">
              {config.queryType === 'table' ? 'Table Name' : 'SQL Query'}
            </Label>
            <Input
              id="tableOrQuery"
              value={config.tableOrQuery}
              onChange={(e) => updateField('tableOrQuery', e.target.value)}
              placeholder={config.queryType === 'table' ? 'my_table' : 'SELECT * FROM ...'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="credentialId">Credential ID</Label>
              <Input
                id="credentialId"
                value={config.credentialId ?? ''}
                onChange={(e) => updateField('credentialId', e.target.value || null)}
                placeholder="Optional credential ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshSchedule">Refresh Schedule (cron)</Label>
              <Input
                id="refreshSchedule"
                value={config.refreshSchedule ?? ''}
                onChange={(e) => updateField('refreshSchedule', e.target.value || null)}
                placeholder="0 */6 * * *"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!isDirty}
              isLoading={saveConfig.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Source Config
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
