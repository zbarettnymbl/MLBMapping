import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { fetchCredentials } from '@/api/credentials';
import {
  testBigQueryConnection,
  previewBigQueryData,
  fetchBigQueryDatasets,
  fetchBigQueryTables,
} from '@/api/bigquery';
import { apiClient } from '@/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CredentialMetadata, BigQueryPreviewResult } from '@mapforge/shared';

const step2Schema = z.object({
  credentialId: z.string().min(1, 'Select a credential'),
  queryType: z.enum(['table', 'query']),
  gcpProject: z.string().optional(),
  dataset: z.string().optional(),
  tableOrQuery: z.string().optional(),
  schedule: z.string().optional(),
});

type Step2Values = z.infer<typeof step2Schema>;

export function Step2DataSource() {
  const {
    dataSource,
    setDataSource,
    setSourceColumns,
    setUniqueKeyColumns,
    uniqueKeyColumns,
    exerciseId,
    nextStep,
  } = useExerciseWizardStore();

  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);
  const [datasets, setDatasets] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [preview, setPreview] = useState<BigQueryPreviewResult | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(uniqueKeyColumns);

  // Combobox open states
  const [credOpen, setCredOpen] = useState(false);
  const [datasetOpen, setDatasetOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  const form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      credentialId: dataSource.connectionConfig?.credentialId || '',
      queryType: dataSource.connectionConfig?.queryType || 'table',
      gcpProject: dataSource.connectionConfig?.gcpProject || '',
      dataset: dataSource.connectionConfig?.dataset || '',
      tableOrQuery: dataSource.connectionConfig?.tableOrQuery || '',
      schedule: dataSource.refreshSchedule || '',
    },
  });

  const credentialId = form.watch('credentialId');
  const dataset = form.watch('dataset');
  const queryType = form.watch('queryType');
  const gcpProject = form.watch('gcpProject');
  const tableOrQuery = form.watch('tableOrQuery');

  useEffect(() => {
    fetchCredentials()
      .then(setCredentials)
      .catch(() => {});
  }, []);

  // When credential changes, fetch datasets
  useEffect(() => {
    if (!credentialId) {
      setDatasets([]);
      setTables([]);
      form.setValue('gcpProject', '');
      form.setValue('dataset', '');
      form.setValue('tableOrQuery', '');
      return;
    }
    setLoadingDatasets(true);
    setDatasets([]);
    setTables([]);
    form.setValue('dataset', '');
    form.setValue('tableOrQuery', '');
    fetchBigQueryDatasets(credentialId)
      .then((result) => {
        form.setValue('gcpProject', result.gcpProject);
        setDatasets(result.datasets);
      })
      .catch(() => {
        setDatasets([]);
      })
      .finally(() => setLoadingDatasets(false));
  }, [credentialId, form]);

  // When dataset changes, fetch tables
  useEffect(() => {
    if (!credentialId || !dataset) {
      setTables([]);
      if (queryType === 'table') {
        form.setValue('tableOrQuery', '');
      }
      return;
    }
    setLoadingTables(true);
    setTables([]);
    if (queryType === 'table') {
      form.setValue('tableOrQuery', '');
    }
    fetchBigQueryTables(credentialId, dataset)
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
  }, [credentialId, dataset, queryType, form]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testBigQueryConnection({
        gcpProject: gcpProject || '',
        dataset: dataset || '',
        tableOrQuery: tableOrQuery || '',
        queryType,
        credentialId,
      });
      if (result.success) {
        setTestResult('Connection successful');
        setDataSource({
          isConnected: true,
          connectionConfig: {
            gcpProject: gcpProject || '',
            dataset: dataset || '',
            tableOrQuery: tableOrQuery || '',
            queryType,
            credentialId,
          },
        });
        const previewResult = await previewBigQueryData({
          gcpProject: gcpProject || '',
          dataset: dataset || '',
          tableOrQuery: tableOrQuery || '',
          queryType,
          credentialId,
          limit: 10,
        });
        setPreview(previewResult);
        setSourceColumns(
          previewResult.columns.map((c, i) => ({
            key: c.name,
            label: c.name,
            originalType: c.type,
            visible: true,
            ordinal: i,
          }))
        );
      } else {
        setTestResult(`Failed: ${result.error}`);
      }
    } catch {
      setTestResult('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const values = form.getValues();
    if (exerciseId) {
      await apiClient.post(`/exercises/${exerciseId}/source-config`, {
        gcpProject: values.gcpProject,
        dataset: values.dataset,
        tableOrQuery: values.tableOrQuery,
        queryType: values.queryType,
        credentialId: values.credentialId,
        refreshSchedule: values.schedule || null,
      });
      setUniqueKeyColumns(selectedKeys);
      await apiClient.put(`/exercises/${exerciseId}`, {
        uniqueKeyColumns: selectedKeys,
      });
    }
    setDataSource({
      connectionConfig: {
        gcpProject: values.gcpProject || '',
        dataset: values.dataset || '',
        tableOrQuery: values.tableOrQuery || '',
        queryType: values.queryType,
        credentialId: values.credentialId,
      },
      refreshSchedule: values.schedule || null,
    });
    nextStep();
  };

  const toggleKey = (col: string) => {
    setSelectedKeys((prev) =>
      prev.includes(col) ? prev.filter((k) => k !== col) : [...prev, col]
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-foreground">
        Data Source Configuration
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Credential Combobox */}
        <div className="col-span-2 space-y-2">
          <Label>Credential</Label>
          <Popover open={credOpen} onOpenChange={setCredOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={credOpen}
                className="w-full justify-between"
              >
                {credentialId
                  ? credentials.find((c) => c.id === credentialId)?.name || 'Selected'
                  : 'Select credential...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search credentials..." />
                <CommandList>
                  <CommandEmpty>No credentials found.</CommandEmpty>
                  <CommandGroup>
                    {credentials.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => {
                          form.setValue('credentialId', c.id);
                          setCredOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            credentialId === c.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* GCP Project (read-only) */}
        <div className="space-y-2">
          <Label>GCP Project</Label>
          <Input
            value={gcpProject || ''}
            readOnly
            className="opacity-70 cursor-not-allowed"
            placeholder={credentialId ? 'Loading...' : 'Select a credential first'}
          />
        </div>

        {/* Dataset Combobox */}
        <div className="space-y-2">
          <Label>Dataset</Label>
          <Popover open={datasetOpen} onOpenChange={setDatasetOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={datasetOpen}
                className="w-full justify-between"
                disabled={!credentialId || loadingDatasets}
              >
                {loadingDatasets
                  ? 'Loading datasets...'
                  : dataset
                    ? dataset
                    : 'Select dataset...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search datasets..." />
                <CommandList>
                  <CommandEmpty>No datasets found.</CommandEmpty>
                  <CommandGroup>
                    {datasets.map((d) => (
                      <CommandItem
                        key={d}
                        value={d}
                        onSelect={() => {
                          form.setValue('dataset', d);
                          setDatasetOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            dataset === d ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {d}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Source Type */}
        <div className="col-span-2 space-y-2">
          <Label>Source Type</Label>
          <RadioGroup
            value={queryType}
            onValueChange={(val) => form.setValue('queryType', val as 'table' | 'query')}
            className="flex gap-4"
          >
            {(['table', 'query'] as const).map((t) => (
              <div key={t} className="flex items-center gap-2">
                <RadioGroupItem value={t} id={`queryType-${t}`} />
                <label
                  htmlFor={`queryType-${t}`}
                  className="text-foreground capitalize cursor-pointer"
                >
                  {t}
                </label>
              </div>
            ))}
          </RadioGroup>

          {/* Table Combobox or SQL textarea */}
          {queryType === 'table' ? (
            <Popover open={tableOpen} onOpenChange={setTableOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tableOpen}
                  className="w-full justify-between"
                  disabled={!dataset || loadingTables}
                >
                  {loadingTables
                    ? 'Loading tables...'
                    : tableOrQuery
                      ? tableOrQuery
                      : 'Select table...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search tables..." />
                  <CommandList>
                    <CommandEmpty>No tables found.</CommandEmpty>
                    <CommandGroup>
                      {tables.map((t) => (
                        <CommandItem
                          key={t}
                          value={t}
                          onSelect={() => {
                            form.setValue('tableOrQuery', t);
                            setTableOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              tableOrQuery === t ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {t}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <Textarea
              value={tableOrQuery || ''}
              onChange={(e) => form.setValue('tableOrQuery', e.target.value)}
              placeholder="SELECT * FROM ..."
              className="h-24 resize-none font-mono text-sm"
            />
          )}
        </div>

        {/* Refresh Schedule */}
        <div className="col-span-2 space-y-2">
          <Label>Refresh Schedule</Label>
          <Select
            value={form.watch('schedule') || ''}
            onValueChange={(val) => form.setValue('schedule', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Manual only" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual only</SelectItem>
              <SelectItem value="0 * * * *">Hourly</SelectItem>
              <SelectItem value="0 0 * * *">Daily</SelectItem>
              <SelectItem value="0 0 * * 1">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={handleTest}
          disabled={testing || !credentialId || !gcpProject || !dataset || !tableOrQuery}
          isLoading={testing}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        {testResult && (
          <span
            className={
              testResult.includes('successful')
                ? 'text-emerald-400'
                : 'text-destructive'
            }
          >
            {testResult}
          </span>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Preview ({preview.totalRows} rows)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Select unique key columns:
              </p>
              <div className="flex flex-wrap gap-2">
                {preview.columns.map((col) => (
                  <label
                    key={col.name}
                    className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded border border-border cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.includes(col.name)}
                      onChange={() => toggleKey(col.name)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">{col.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.columns.map((c) => (
                      <TableHead key={c.name}>{c.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {preview.columns.map((c) => (
                        <TableCell key={c.name}>
                          {String(row[c.name] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={!dataSource.isConnected && !preview}
      >
        Save & Continue
      </Button>
    </div>
  );
}
