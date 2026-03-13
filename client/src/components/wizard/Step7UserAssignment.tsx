import { useState } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { apiClient } from '@/api/client';
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

export function Step7UserAssignment() {
  const { userAssignments, setUserAssignments, deadline, setDeadline } = useExerciseWizardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await apiClient.get('/admin/users', { params: { search: searchQuery } });
      const users = response.data.users || response.data || [];
      setSearchResults(Array.isArray(users) ? users : []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const addUser = (user: { id: string; email: string; name: string }) => {
    if (userAssignments.some(a => a.userId === user.id)) return;
    setUserAssignments([...userAssignments, { userId: user.id, email: user.email, name: user.name, role: 'editor' }]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const updateRole = (userId: string, role: 'editor' | 'viewer') => {
    setUserAssignments(userAssignments.map(a => a.userId === userId ? { ...a, role } : a));
  };

  const removeUser = (userId: string) => {
    setUserAssignments(userAssignments.filter(a => a.userId !== userId));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-foreground">User Assignment</h2>
      <div className="space-y-2">
        <Label>Search Users</Label>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name or email..."
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={handleSearch}
            disabled={searching}
            isLoading={searching}
          >
            {searching ? '...' : 'Search'}
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="border border-border rounded-md overflow-hidden">
            {searchResults.map(user => (
              <button
                key={user.id}
                onClick={() => addUser(user)}
                className="w-full flex items-center justify-between px-3 py-2 bg-muted hover:bg-accent text-left border-b border-border last:border-0 cursor-pointer"
              >
                <span className="text-foreground">{user.name}</span>
                <span className="text-muted-foreground text-sm">{user.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {userAssignments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Assigned Users</h3>
          {userAssignments.map(a => (
            <div key={a.userId} className="flex items-center gap-3 p-3 bg-muted border border-border rounded-md">
              <div className="flex-1">
                <span className="text-foreground">{a.name}</span>
                <span className="ml-2 text-sm text-muted-foreground">{a.email}</span>
              </div>
              <Select
                value={a.role}
                onValueChange={(val) => updateRole(a.userId, val as 'editor' | 'viewer')}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => removeUser(a.userId)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <Label>Deadline</Label>
        <Input
          type="date"
          value={deadline || ''}
          onChange={(e) => setDeadline(e.target.value || null)}
          className="w-auto"
        />
      </div>
    </div>
  );
}
