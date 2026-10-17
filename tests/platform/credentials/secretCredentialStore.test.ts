import { describe, it, expect, beforeEach } from 'vitest';
import { CredentialType } from '@esync/core/ports';
import { SecretCredentialStore } from '@esync/platform/credentials/secretCredentialStore';
import Secret, { resetMockSecret, Schema, SchemaFlags, SchemaAttributeType } from 'gi://Secret';

describe('SecretCredentialStore', () => {
  let store: SecretCredentialStore;

  beforeEach(() => {
    resetMockSecret();
    store = new SecretCredentialStore();
  });

  describe('constructor', () => {
    it('allows custom schema injection', async () => {
      const customSchema = new Schema('org.custom.Schema', SchemaFlags.NONE, {
        provider: SchemaAttributeType.STRING,
        type: SchemaAttributeType.STRING,
      });
      const customStore = new SecretCredentialStore(customSchema);
      await customStore.setCredential('gitlab', CredentialType.TOKEN, 'glpat-token');
      expect(Secret.password_store).toHaveBeenCalledWith(
        customSchema,
        { provider: 'gitlab', type: 'token' },
        Secret.COLLECTION_DEFAULT,
        'Extensions Sync: gitlab (token)',
        'glpat-token',
        null,
        expect.any(Function),
      );
    });

    it('creates default schema when no schema is provided', () => {
      const defaultStore = new SecretCredentialStore();
      expect((defaultStore as any).schema).toBeDefined();
      expect((defaultStore as any).schema.name).toBe('org.gnome.shell.extensions.extensions-sync.Credentials');
      expect((defaultStore as any).schema.flags).toBe(SchemaFlags.NONE);
      expect((defaultStore as any).schema.attributes).toEqual({
        provider: SchemaAttributeType.STRING,
        type: SchemaAttributeType.STRING,
      });
    });
  });

  describe('setCredential', () => {
    it('stores a credential using Secret.password_store with DEFAULT_SCHEMA', async () => {
      await store.setCredential('github', CredentialType.TOKEN, 'ghp_secret_token');
      const stored = await store.getCredential('github', CredentialType.TOKEN);
      expect(stored).toBe('ghp_secret_token');
      const passedSchema = Secret.password_store.mock.calls[0][0];
      expect(passedSchema.name).toBe('org.gnome.shell.extensions.extensions-sync.Credentials');
      expect(passedSchema.flags).toBe(SchemaFlags.NONE);
      expect(passedSchema.attributes).toEqual({
        provider: SchemaAttributeType.STRING,
        type: SchemaAttributeType.STRING,
      });
      expect(Secret.password_store).toHaveBeenCalledWith(
        passedSchema,
        { provider: 'github', type: 'token' },
        Secret.COLLECTION_DEFAULT,
        'Extensions Sync: github (token)',
        'ghp_secret_token',
        null,
        expect.any(Function),
      );
    });

    it('rejects when password_store_finish throws', async () => {
      Secret.password_store_finish.mockImplementationOnce(() => {
        throw new Error('Keyring locked');
      });

      await expect(store.setCredential('github', CredentialType.TOKEN, 'secret')).rejects.toThrow('Keyring locked');
    });
  });

  describe('getCredential', () => {
    it('returns null when credential does not exist', async () => {
      const result = await store.getCredential('unknown', CredentialType.TOKEN);
      expect(result).toBeNull();
    });

    it('returns credential value when found', async () => {
      await store.setCredential('github', CredentialType.REMOTE_ID, 'gist-12345');
      const result = await store.getCredential('github', CredentialType.REMOTE_ID);
      expect(result).toBe('gist-12345');
    });

    it('rejects when password_lookup_finish throws', async () => {
      Secret.password_lookup_finish.mockImplementationOnce(() => {
        throw new Error('Lookup failure');
      });

      await expect(store.getCredential('github', CredentialType.TOKEN)).rejects.toThrow('Lookup failure');
    });
  });

  describe('deleteCredential', () => {
    it('removes the credential from Secret service', async () => {
      await store.setCredential('github', CredentialType.TOKEN, 'token_to_delete');
      expect(await store.getCredential('github', CredentialType.TOKEN)).toBe('token_to_delete');

      await store.deleteCredential('github', CredentialType.TOKEN);
      expect(await store.getCredential('github', CredentialType.TOKEN)).toBeNull();

      expect(Secret.password_clear).toHaveBeenCalledWith(
        expect.any(Object),
        { provider: 'github', type: 'token' },
        null,
        expect.any(Function),
      );
    });

    it('rejects when password_clear_finish throws', async () => {
      Secret.password_clear_finish.mockImplementationOnce(() => {
        throw new Error('Clear failure');
      });

      await expect(store.deleteCredential('github', CredentialType.TOKEN)).rejects.toThrow('Clear failure');
    });
  });

  describe('getProviderCredentials', () => {
    it('returns both token and remoteId when present', async () => {
      await store.setCredential('github', CredentialType.TOKEN, 'ghp_abc');
      await store.setCredential('github', CredentialType.REMOTE_ID, 'gist_xyz');

      const creds = await store.getProviderCredentials('github');
      expect(creds).toEqual({
        token: 'ghp_abc',
        remoteId: 'gist_xyz',
      });
    });

    it('returns undefined fields when credentials are missing', async () => {
      const creds = await store.getProviderCredentials('gitlab');
      expect(creds).toEqual({
        token: undefined,
        remoteId: undefined,
      });
    });

    it('returns partially populated credentials', async () => {
      await store.setCredential('gitlab', CredentialType.TOKEN, 'glpat_123');

      const creds = await store.getProviderCredentials('gitlab');
      expect(creds).toEqual({
        token: 'glpat_123',
        remoteId: undefined,
      });
    });
  });
});
