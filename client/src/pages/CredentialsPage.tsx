import { useEffect, useState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { fetchCredentials, createCredential, deleteCredential } from '@/api/credentials';
import type { CredentialMetadata } from '@mapforge/shared';

const credentialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  credentialValue: z.string().min(1, 'Service account JSON is required'),
});

type CredentialFormValues = z.infer<typeof credentialSchema>;

export function CredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      name: '',
      credentialValue: '',
    },
  });

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

  const handleAdd = async (values: CredentialFormValues) => {
    setSaving(true);
    try {
      await createCredential({ name: values.name.trim(), credentialType: 'gcp_service_account', credentialValue: values.credentialValue.trim() });
      setShowAdd(false);
      form.reset();
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

  const handleCancel = () => {
    setShowAdd(false);
    form.reset();
  };

  return (
    <AppLayout title="Connections">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              BigQuery service account credentials for connecting to data sources. Credentials are encrypted at rest.
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} disabled={showAdd}>
            + Add Credential
          </Button>
        </div>

        {/* Add form */}
        {showAdd && (
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Production BigQuery" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="credentialValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Account JSON</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Paste your GCP service account key JSON here..."
                            rows={6}
                            className="font-mono text-xs resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={saving} isLoading={saving}>
                      {saving ? 'Saving...' : 'Save Credential'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="ghost" size="sm" onClick={load}>Retry</Button>
          </div>
        )}

        {!loading && !error && credentials.length === 0 && !showAdd && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-lg bg-muted flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No credentials configured.</p>
            <p className="text-muted-foreground text-xs">Add a BigQuery service account to connect exercises and pipelines to your data.</p>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              Add your first credential
            </Button>
          </div>
        )}

        {!loading && !error && credentials.length > 0 && (
          <div className="space-y-2">
            {credentials.map((cred) => (
              <Card key={cred.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-muted flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{cred.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(cred.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(cred.id, cred.name)}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
