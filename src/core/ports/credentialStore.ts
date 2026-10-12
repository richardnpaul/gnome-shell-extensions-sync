export enum CredentialType {
  TOKEN = 'token',
  REMOTE_ID = 'remote_id',
}

export interface ProviderCredentials {
  token?: string;
  remoteId?: string;
}

export interface CredentialStorePort {
  getCredential(provider: string, type: CredentialType): Promise<string | null>;
  setCredential(provider: string, type: CredentialType, secret: string): Promise<void>;
  deleteCredential(provider: string, type: CredentialType): Promise<void>;
  getProviderCredentials(provider: string): Promise<ProviderCredentials>;
}
