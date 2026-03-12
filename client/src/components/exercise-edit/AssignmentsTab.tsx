import { useState } from 'react';
import { UserPlus, Trash2, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useExerciseAssignments,
  useUpdateAssignmentRole,
  useRemoveAssignment,
  useBulkAssign,
  useSendNotification,
} from '@/hooks/useExerciseEdit';
import { apiClient } from '@/api/client';
import type { ExerciseAssignment } from '@mapforge/shared';

interface AssignmentsTabProps {
  exerciseId: string;
}

interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

export function AssignmentsTab({ exerciseId }: AssignmentsTabProps) {
  const { data: assignments = [], isLoading } = useExerciseAssignments(exerciseId);
  const updateRole = useUpdateAssignmentRole(exerciseId);
  const removeAssignment = useRemoveAssignment(exerciseId);
  const bulkAssign = useBulkAssign(exerciseId);
  const sendNotification = useSendNotification(exerciseId);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, { user: UserSearchResult; role: 'editor' | 'viewer' }>>(new Map());
  const [removeTarget, setRemoveTarget] = useState<ExerciseAssignment | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await apiClient.get<{ users: UserSearchResult[] }>('/admin/users/search', {
        params: { q: searchQuery },
      });
      // Filter out users that are already assigned
      const assignedIds = new Set(assignments.map((a) => a.userId));
      setSearchResults(response.data.users.filter((u) => !assignedIds.has(u.id)));
    } catch {
      // If the search endpoint doesn't exist yet, show empty results
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleUserSelection = (user: UserSearchResult) => {
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      if (next.has(user.id)) {
        next.delete(user.id);
      } else {
        next.set(user.id, { user, role: 'editor' });
      }
      return next;
    });
  };

  const handleBulkAssign = () => {
    const users = Array.from(selectedUsers.values()).map(({ user, role }) => ({
      userId: user.id,
      role,
    }));
    bulkAssign.mutate({ users }, {
      onSuccess: () => {
        setSelectedUsers(new Map());
        setSearchResults([]);
        setSearchQuery('');
      },
    });
  };

  const handleRoleChange = (assignment: ExerciseAssignment, role: string) => {
    updateRole.mutate({ assignmentId: assignment.id, role });
  };

  const handleNotify = (assignment: ExerciseAssignment) => {
    sendNotification.mutate({
      assignmentId: assignment.id,
      request: { type: 'reminder' },
    });
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Add Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search users by name or email..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={handleSearch} isLoading={isSearching}>
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-md divide-y">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-3 py-2">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => toggleUserSelection(user)}
                      className="rounded border-border"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </label>
                  {selectedUsers.has(user.id) && (
                    <Select
                      value={selectedUsers.get(user.id)!.role}
                      onValueChange={(role) => {
                        setSelectedUsers((prev) => {
                          const next = new Map(prev);
                          const entry = next.get(user.id)!;
                          next.set(user.id, { ...entry, role: role as 'editor' | 'viewer' });
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedUsers.size > 0 && (
            <div className="flex justify-end">
              <Button onClick={handleBulkAssign} isLoading={bulkAssign.isPending}>
                <UserPlus className="h-4 w-4 mr-1" />
                Assign {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Assignments ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading assignments...</p>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md border border-border"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{assignment.userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{assignment.userEmail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={assignment.role}
                      onValueChange={(role) => handleRoleChange(assignment, role)}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant="outline" className="text-xs">
                      {new Date(assignment.assignedAt).toLocaleDateString()}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleNotify(assignment)}
                    >
                      <Bell className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setRemoveTarget(assignment)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={() => setRemoveTarget(null)}
        title="Remove assignment"
        description={`Remove ${removeTarget?.userName} from this exercise? They will lose access.`}
        confirmLabel="Remove"
        variant="destructive"
        loading={removeAssignment.isPending}
        onConfirm={() => {
          if (removeTarget) {
            removeAssignment.mutate(removeTarget.id, {
              onSuccess: () => setRemoveTarget(null),
            });
          }
        }}
      />
    </div>
  );
}
