export interface CredentialMetadata {
  id: string;
  name: string;
  credentialType: 'gcp_service_account';
  createdAt: string;
  createdBy: string;
}

export interface CreateCredentialPayload {
  name: string;
  credentialType: 'gcp_service_account';
  credentialValue: string; // raw JSON string -- encrypted server-side
}
