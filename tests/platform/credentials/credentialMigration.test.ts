import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CredentialType } from '@esync/core/ports';
import { InMemoryCredentialStore } from '@esync/platform/credentials/inMemoryCredentialStore';
import { CredentialMigrator } from '@esync/platform/credentials/credentialMigration';

describe('CredentialMigrator', () => {
  let credentialStore: InMemoryCredentialStore;
  let mockSettings: {
    get_string: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    credentialStore = new InMemoryCredentialStore();
    mockSettings = {
      get_string: vi.fn().mockReturnValue(''),
      reset: vi.fn(),
    };
  });

  it('migrates github legacy keys with whitespace trimmed to credential store and resets settings', async () => {
    const logSpy = vi.spyOn(globalThis as any, 'log');
    mockSettings.get_string.mockImplementation((key: string) => {
      if (key === 'github-user-token') return '  ghp_secret  ';
      if (key === 'github-gist-id') return '  gist_123  ';
      return '';
    });

    const migrator = new CredentialMigrator(mockSettings as any, credentialStore);
    await migrator.migrate();

    expect(await credentialStore.getCredential('github', CredentialType.TOKEN)).toBe('ghp_secret');
    expect(await credentialStore.getCredential('github', CredentialType.REMOTE_ID)).toBe('gist_123');
    expect(mockSettings.reset).toHaveBeenCalledWith('github-user-token');
    expect(mockSettings.reset).toHaveBeenCalledWith('github-gist-id');
    expect(logSpy).toHaveBeenCalledWith(
      '[extensions-sync] [credentialMigration] Migrated legacy key github-user-token to github:token',
    );
    expect(logSpy).toHaveBeenCalledWith(
      '[extensions-sync] [credentialMigration] Migrated legacy key github-gist-id to github:remote_id',
    );
  });

  it('migrates gitlab legacy keys to credential store and resets settings', async () => {
    mockSettings.get_string.mockImplementation((key: string) => {
      if (key === 'gitlab-user-token') return 'glpat_secret';
      if (key === 'gitlab-snippet-id') return 'snippet_456';
      return '';
    });

    const migrator = new CredentialMigrator(mockSettings as any, credentialStore);
    await migrator.migrate();

    expect(await credentialStore.getCredential('gitlab', CredentialType.TOKEN)).toBe('glpat_secret');
    expect(await credentialStore.getCredential('gitlab', CredentialType.REMOTE_ID)).toBe('snippet_456');
    expect(mockSettings.reset).toHaveBeenCalledWith('gitlab-user-token');
    expect(mockSettings.reset).toHaveBeenCalledWith('gitlab-snippet-id');
  });

  it('skips keys that are empty or whitespace only', async () => {
    mockSettings.get_string.mockImplementation((key: string) => {
      if (key === 'github-user-token') return '   ';
      return '';
    });

    const migrator = new CredentialMigrator(mockSettings as any, credentialStore);
    await migrator.migrate();

    expect(await credentialStore.getCredential('github', CredentialType.TOKEN)).toBeNull();
    expect(mockSettings.reset).not.toHaveBeenCalled();
  });

  it('does not reset settings key and logs error if store setCredential throws', async () => {
    const logSpy = vi.spyOn(globalThis as any, 'log');
    mockSettings.get_string.mockImplementation((key: string) => {
      if (key === 'github-user-token') return 'ghp_secret';
      return '';
    });

    vi.spyOn(credentialStore, 'setCredential').mockRejectedValueOnce(new Error('Keyring error'));

    const migrator = new CredentialMigrator(mockSettings as any, credentialStore);
    await migrator.migrate();

    expect(mockSettings.reset).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      '[extensions-sync] [credentialMigration] Failed to migrate legacy key github-user-token: Error: Keyring error',
    );
  });
});
