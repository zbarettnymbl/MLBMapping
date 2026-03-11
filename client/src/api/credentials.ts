import { apiClient } from './client';
import type { CredentialMetadata, CreateCredentialPayload } from '@mapforge/shared';

export async function createCredential(payload: CreateCredentialPayload): Promise<CredentialMetadata> {
  const response = await apiClient.post<CredentialMetadata>('/credentials', payload);
  return response.data;
}

export async function fetchCredentials(): Promise<CredentialMetadata[]> {
  const response = await apiClient.get<{ credentials: CredentialMetadata[] }>('/credentials');
  return response.data.credentials;
}

export async function deleteCredential(id: string): Promise<void> {
  await apiClient.delete(`/credentials/${id}`);
}
