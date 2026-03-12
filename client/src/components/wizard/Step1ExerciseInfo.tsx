import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';

const step1Schema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  description: z.string().optional(),
  viewMode: z.enum(['flat', 'matrix']),
});

type Step1Values = z.infer<typeof step1Schema>;

export function Step1ExerciseInfo() {
  const { exerciseInfo, setExerciseInfo, setExerciseId, exerciseId, nextStep } =
    useExerciseWizardStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: exerciseInfo.name,
      description: exerciseInfo.description || '',
      viewMode: exerciseInfo.viewMode as 'flat' | 'matrix',
    },
  });

  const handleSave = async (values: Step1Values) => {
    setSaving(true);
    setError('');
    try {
      setExerciseInfo({
        name: values.name,
        description: values.description || '',
        viewMode: values.viewMode,
      });

      if (!exerciseId) {
        const response = await apiClient.post('/exercises', {
          name: values.name,
          description: values.description,
          viewMode: values.viewMode,
        });
        setExerciseId(response.data.id);
      } else {
        await apiClient.put(`/exercises/${exerciseId}`, {
          name: values.name,
          description: values.description,
          viewMode: values.viewMode,
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
      <h2 className="text-xl font-semibold text-foreground">
        Exercise Information
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Development Programming 2026"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the purpose of this exercise..."
                    className="h-24 resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="viewMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>View Mode</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex gap-4"
                  >
                    {(['flat', 'matrix'] as const).map((mode) => (
                      <div key={mode} className="flex items-center gap-2">
                        <RadioGroupItem value={mode} id={`viewMode-${mode}`} />
                        <label
                          htmlFor={`viewMode-${mode}`}
                          className="text-foreground capitalize cursor-pointer"
                        >
                          {mode}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  {field.value === 'flat'
                    ? 'Flat: Each record is a single row. Best for straightforward classification where each row is independent.'
                    : 'Matrix: Records are grouped and displayed in a grid layout. Best for cross-referencing data across two dimensions (e.g., players vs. categories).'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" isLoading={saving}>
            {saving
              ? 'Saving...'
              : exerciseId
                ? 'Update & Continue'
                : 'Create & Continue'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
