import { describe, it, expect, beforeEach } from 'vitest';
import { CredentialType } from '@esync/core/ports';
import { InMemoryCredentialStore } from '@esync/platform/credentials/inMemoryCredentialStore';

describe('InMemoryCredentialStore', () => {
  let store: InMemoryCredentialStore;

  beforeEach(() => {
    store = new InMemoryCredentialStore();
  });

  it('returns null for non-existent credential', async () => {
    const cred = await store.getCredential('github', CredentialType.TOKEN);
    expect(cred).toBeNull();
  });

  it('stores and retrieves a credential', async () => {
    await store.setCredential('github', CredentialType.TOKEN, 'ghp_secret123');
    const cred = await store.getCredential('github', CredentialType.TOKEN);
    expect(cred).toBe('ghp_secret123');
  });

  it('deletes an existing credential', async () => {
    await store.setCredential('gitlab', CredentialType.REMOTE_ID, 'snippet_999');
    await store.deleteCredential('gitlab', CredentialType.REMOTE_ID);
    const cred = await store.getCredential('gitlab', CredentialType.REMOTE_ID);
    expect(cred).toBeNull();
  });

  it('deleting non-existent credential does not throw', async () => {
    await expect(store.deleteCredential('unknown', CredentialType.TOKEN)).resolves.toBeUndefined();
  });

  it('retrieves composite provider credentials dynamically', async () => {
    await store.setCredential('github', CredentialType.TOKEN, 'ghp_token');
    await store.setCredential('github', CredentialType.REMOTE_ID, 'gist_123');

    const creds = await store.getProviderCredentials('github');
    expect(creds).toEqual({
      token: 'ghp_token',
      remoteId: 'gist_123',
    });
  });

  it('returns empty provider credentials when none are set', async () => {
    const creds = await store.getProviderCredentials('nextcloud');
    expect(creds).toEqual({
      token: undefined,
      remoteId: undefined,
    });
  });

  it('clears all credentials', async () => {
    await store.setCredential('github', CredentialType.TOKEN, 'tok');
    store.clear();
    const cred = await store.getCredential('github', CredentialType.TOKEN);
    expect(cred).toBeNull();
  });
});
