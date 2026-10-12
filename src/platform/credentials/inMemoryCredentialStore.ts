import { CredentialStorePort, CredentialType, ProviderCredentials } from '@esync/core/ports';

export class InMemoryCredentialStore implements CredentialStorePort {
  private store: Map<string, string> = new Map();

  private toKey(provider: string, type: CredentialType): string {
    return `${provider}:${type}`;
  }

  async getCredential(provider: string, type: CredentialType): Promise<string | null> {
    const key = this.toKey(provider, type);
    return this.store.get(key) ?? null;
  }

  async setCredential(provider: string, type: CredentialType, secret: string): Promise<void> {
    const key = this.toKey(provider, type);
    this.store.set(key, secret);
  }

  async deleteCredential(provider: string, type: CredentialType): Promise<void> {
    const key = this.toKey(provider, type);
    this.store.delete(key);
  }

  async getProviderCredentials(provider: string): Promise<ProviderCredentials> {
    const token = await this.getCredential(provider, CredentialType.TOKEN);
    const remoteId = await this.getCredential(provider, CredentialType.REMOTE_ID);

    return {
      token: token ?? undefined,
      remoteId: remoteId ?? undefined,
    };
  }

  clear(): void {
    this.store.clear();
  }
}
