import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { fetchCredentials, createCredential, deleteCredential } from '@/api/credentials';
import type { CredentialMetadata } from '@mapforge/shared';

export function CredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addJson, setAddJson] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCredentials();
      setCredentials(data);
    } catch {
      setError('Failed to load credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!addName.trim() || !addJson.trim()) return;
    setSaving(true);
    try {
      await createCredential({ name: addName.trim(), credentialType: 'gcp_service_account', credentialValue: addJson.trim() });
      setShowAdd(false);
      setAddName('');
      setAddJson('');
      load();
    } catch {
      setError('Failed to save credential.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete credential "${name}"? This cannot be undone.`)) return;
    try {
      await deleteCredential(id);
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <AppLayout title="Connections">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-forge-400">
              BigQuery service account credentials for connecting to data sources. Credentials are encrypted at rest.
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} disabled={showAdd}>
            + Add Credential
          </Button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="p-4 bg-forge-800 border border-forge-600 rounded-lg space-y-3">
            <div>
              <label className="block text-xs font-medium text-forge-300 mb-1">Name</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g., Production BigQuery"
                className="w-full px-3 py-2 bg-forge-900 border border-forge-600 rounded text-sm text-forge-100 placeholder:text-forge-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-forge-300 mb-1">Service Account JSON</label>
              <textarea
                value={addJson}
                onChange={(e) => setAddJson(e.target.value)}
                placeholder="Paste your GCP service account key JSON here..."
                rows={6}
                className="w-full px-3 py-2 bg-forge-900 border border-forge-600 rounded text-sm text-forge-100 font-mono text-xs placeholder:text-forge-600 focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setAddName(''); setAddJson(''); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={saving || !addName.trim() || !addJson.trim()}>
                {saving ? 'Saving...' : 'Save Credential'}
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <Button variant="ghost" size="sm" onClick={load}>Retry</Button>
          </div>
        )}

        {!loading && !error && credentials.length === 0 && !showAdd && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-lg bg-forge-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-forge-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <p className="text-forge-400 text-sm">No credentials configured.</p>
            <p className="text-forge-500 text-xs">Add a BigQuery service account to connect exercises and pipelines to your data.</p>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              Add your first credential
            </Button>
          </div>
        )}

        {!loading && !error && credentials.length > 0 && (
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-4 bg-forge-800/50 border border-forge-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-forge-700 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-forge-100">{cred.name}</h3>
                    <p className="text-xs text-forge-500">
                      Added {new Date(cred.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(cred.id, cred.name)}
                  className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
