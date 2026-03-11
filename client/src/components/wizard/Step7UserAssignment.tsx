import { useState } from 'react';
import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { apiClient } from '@/api/client';

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
      <h2 className="text-xl font-semibold text-forge-100">User Assignment</h2>
      <div>
        <label className="block text-sm font-medium text-forge-300 mb-1">Search Users</label>
        <div className="flex gap-2">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100"
            placeholder="Search by name or email..." />
          <button onClick={handleSearch} disabled={searching}
            className="px-4 py-2 bg-forge-700 text-forge-200 rounded-md hover:bg-forge-600 disabled:opacity-50">
            {searching ? '...' : 'Search'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 border border-forge-700 rounded-md overflow-hidden">
            {searchResults.map(user => (
              <button key={user.id} onClick={() => addUser(user)}
                className="w-full flex items-center justify-between px-3 py-2 bg-forge-800 hover:bg-forge-700 text-left border-b border-forge-700 last:border-0">
                <span className="text-forge-200">{user.name}</span>
                <span className="text-forge-400 text-sm">{user.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {userAssignments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-forge-400">Assigned Users</h3>
          {userAssignments.map(a => (
            <div key={a.userId} className="flex items-center gap-3 p-3 bg-forge-800 border border-forge-700 rounded-md">
              <div className="flex-1">
                <span className="text-forge-100">{a.name}</span>
                <span className="ml-2 text-sm text-forge-400">{a.email}</span>
              </div>
              <select value={a.role} onChange={(e) => updateRole(a.userId, e.target.value as 'editor' | 'viewer')}
                className="px-2 py-1 bg-forge-700 border border-forge-600 rounded text-sm text-forge-200">
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button onClick={() => removeUser(a.userId)} className="text-sm text-red-400 hover:text-red-300">Remove</button>
            </div>
          ))}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-forge-300 mb-1">Deadline</label>
        <input type="date" value={deadline || ''} onChange={(e) => setDeadline(e.target.value || null)}
          className="px-3 py-2 bg-forge-800 border border-forge-600 rounded-md text-forge-100" />
      </div>
    </div>
  );
}
