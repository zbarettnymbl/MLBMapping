import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useUpdateExercise, useUpdateStatus } from '@/hooks/useExerciseEdit';
import type { ExerciseDetail } from '@mapforge/shared';

const STATUS_TRANSITIONS: Record<string, { label: string; target: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }[]> = {
  draft: [
    { label: 'Activate', target: 'active', variant: 'default' },
  ],
  active: [
    { label: 'Pause', target: 'paused', variant: 'outline' },
    { label: 'Complete', target: 'completed', variant: 'secondary' },
  ],
  paused: [
    { label: 'Resume', target: 'active', variant: 'default' },
    { label: 'Complete', target: 'completed', variant: 'secondary' },
  ],
  completed: [
    { label: 'Archive', target: 'archived', variant: 'destructive' },
    { label: 'Reopen', target: 'active', variant: 'outline' },
  ],
  archived: [],
};

interface GeneralTabProps {
  exerciseId: string;
  exercise: ExerciseDetail;
  onDirtyChange: (dirty: boolean) => void;
}

export function GeneralTab({ exerciseId, exercise, onDirtyChange }: GeneralTabProps) {
  const [name, setName] = useState(exercise.name);
  const [description, setDescription] = useState(exercise.description);
  const [deadline, setDeadline] = useState(exercise.deadline ?? '');
  const [viewMode, setViewMode] = useState(exercise.viewMode);

  const [statusTarget, setStatusTarget] = useState<string | null>(null);

  const updateExercise = useUpdateExercise(exerciseId);
  const updateStatus = useUpdateStatus(exerciseId);

  const isDirty =
    name !== exercise.name ||
    description !== exercise.description ||
    (deadline || null) !== (exercise.deadline || null) ||
    viewMode !== exercise.viewMode;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  // Sync form when exercise data refreshes
  useEffect(() => {
    setName(exercise.name);
    setDescription(exercise.description);
    setDeadline(exercise.deadline ?? '');
    setViewMode(exercise.viewMode);
  }, [exercise]);

  const handleSave = () => {
    updateExercise.mutate({
      name,
      description,
      deadline: deadline || null,
      viewMode,
    });
  };

  const transitions = STATUS_TRANSITIONS[exercise.status] ?? [];

  return (
    <div className="space-y-6 pt-4">
      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exercise Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Exercise description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="viewMode">View Mode</Label>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'flat' | 'matrix')}>
                <SelectTrigger id="viewMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="matrix">Matrix</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!isDirty}
              isLoading={updateExercise.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status transitions */}
      {transitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Current status: <span className="font-medium text-foreground">{exercise.status}</span>
            </p>
            <div className="flex gap-2">
              {transitions.map((t) => (
                <Button
                  key={t.target}
                  variant={t.variant}
                  size="sm"
                  onClick={() => setStatusTarget(t.target)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={() => setStatusTarget(null)}
        title="Change status"
        description={`Are you sure you want to change the status to "${statusTarget}"?`}
        confirmLabel="Confirm"
        variant="default"
        loading={updateStatus.isPending}
        onConfirm={() => {
          if (statusTarget) {
            updateStatus.mutate(statusTarget, {
              onSuccess: () => setStatusTarget(null),
            });
          }
        }}
      />
    </div>
  );
}
