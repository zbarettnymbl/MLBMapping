import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Mail, Search, ChevronDown, Settings } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiClient } from '@/api/client';
import {
  useExerciseAssignments,
  useUpdateAssignmentRole,
  useRemoveAssignment,
  useBulkAssign,
  useSendNotification,
} from '@/hooks/useExerciseEdit';
import type { ExerciseAssignment } from '@mapforge/shared';

interface AssignmentSummaryDropdownProps {
  exerciseId: string;
  userColorPalette: Map<string, string>;
  permissionRowCounts: Map<string, number | null>; // userId -> row count (null = all)
  onAdvancedClick: (assignment: ExerciseAssignment) => void;
}

export function AssignmentSummaryDropdown({
  exerciseId, userColorPalette, permissionRowCounts, onAdvancedClick,
}: AssignmentSummaryDropdownProps) {
  const { data: assignments } = useExerciseAssignments(exerciseId);
  const updateRole = useUpdateAssignmentRole(exerciseId);
  const removeAssignment = useRemoveAssignment(exerciseId);
  const bulkAssign = useBulkAssign(exerciseId);
  const sendNotification = useSendNotification(exerciseId);

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await apiClient.get('/admin/users', { params: { search: searchQuery } });
      const users = response.data.users || response.data || [];
      setSearchResults(Array.isArray(users) ? users : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddUser = (user: { id: string }) => {
    bulkAssign.mutate({ users: [{ userId: user.id, role: 'editor' }] });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    removeAssignment.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) });
  };

  const count = assignments?.length ?? 0;

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Badge variant="secondary" className="mr-1.5">{count}</Badge>
        user{count !== 1 ? 's' : ''} assigned
        <ChevronDown className="h-3.5 w-3.5 ml-1" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-96 bg-popover border border-border rounded-md shadow-lg z-50">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search users to add..."
                className="flex-1 h-8 text-sm"
              />
              <Button variant="secondary" size="sm" onClick={handleSearch} disabled={searching}>
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border border-border rounded-md overflow-hidden">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleAddUser(user)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-sm hover:bg-accent border-b border-border last:border-0"
                  >
                    <span>{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto">
            {assignments?.map(a => {
              const rowCount = permissionRowCounts.get(a.userId);
              const rowLabel = rowCount === null ? 'all rows' : `${rowCount} rows`;
              return (
                <div key={a.id} className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: userColorPalette.get(a.userId) || '#6b7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.userName}</div>
                    <div className="text-xs text-muted-foreground">{rowLabel}</div>
                  </div>
                  <Select
                    value={a.role}
                    onValueChange={(val) => updateRole.mutate({ assignmentId: a.id, role: val })}
                  >
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => sendNotification.mutate({ assignmentId: a.id, request: { type: 'assignment' } })} title="Notify">
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onAdvancedClick(a)} title="Advanced permissions">
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setRemoveTarget({ id: a.id, name: a.userName })} title="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            {count === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">No users assigned</div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={() => setRemoveTarget(null)}
        title="Remove assignment?"
        description={`Remove ${removeTarget?.name} from this exercise?`}
        confirmLabel="Remove"
        variant="destructive"
        loading={removeAssignment.isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
