import { describe, it, expect, beforeEach } from 'vitest';
import { PrefsViewModel } from '@esync/prefs/prefsViewModel';
import { SyncProviderType } from '@esync/api/types';
import { DataProviderType } from '@esync/data';
import { Settings } from '@gi-types/gio2';
import { InMemoryCredentialStore } from '@esync/platform/credentials/inMemoryCredentialStore';
import { CredentialType } from '@esync/core/ports';

describe('PrefsViewModel', () => {
  let settings: Settings;
  let credentialStore: InMemoryCredentialStore;
  let viewModel: PrefsViewModel;

  beforeEach(() => {
    settings = new Settings('org.gnome.shell.extensions.extensions-sync');
    credentialStore = new InMemoryCredentialStore();
    viewModel = new PrefsViewModel(settings, credentialStore);
  });

  describe('provider settings', () => {
    it('gets and sets active provider', () => {
      settings.set_enum('provider', SyncProviderType.GITHUB);
      expect(viewModel.provider).toBe(SyncProviderType.GITHUB);
      expect(viewModel.isProviderActive(SyncProviderType.GITHUB)).toBe(true);
      expect(viewModel.isProviderActive(SyncProviderType.GITLAB)).toBe(false);

      viewModel.setProvider(SyncProviderType.GITLAB);
      expect(viewModel.provider).toBe(SyncProviderType.GITLAB);
      expect(settings.get_enum('provider')).toBe(SyncProviderType.GITLAB);
      expect(viewModel.isProviderActive(SyncProviderType.GITLAB)).toBe(true);
    });
  });

  describe('credential storage', () => {
    it('gets and sets credentials dynamically via credential store', async () => {
      await viewModel.setRemoteId('github', 'new-gist');
      await viewModel.setToken('github', 'new-token');

      expect(await viewModel.getRemoteId('github')).toBe('new-gist');
      expect(await viewModel.getToken('github')).toBe('new-token');
      expect(await credentialStore.getCredential('github', CredentialType.REMOTE_ID)).toBe('new-gist');
      expect(await credentialStore.getCredential('github', CredentialType.TOKEN)).toBe('new-token');

      // Returns empty string if not found
      expect(await viewModel.getRemoteId('unknown')).toBe('');
      expect(await viewModel.getToken('unknown')).toBe('');
    });

    it('gets and sets gitlab credentials dynamically', async () => {
      await viewModel.setRemoteId('gitlab', 'new-snippet');
      await viewModel.setToken('gitlab', 'new-token');

      expect(await viewModel.getRemoteId('gitlab')).toBe('new-snippet');
      expect(await viewModel.getToken('gitlab')).toBe('new-token');
    });
  });

  describe('local backup settings', () => {
    it('gets and sets backup file location', () => {
      settings.set_string('backup-file-location', '/init/path.json');
      expect(viewModel.backupFileLocation).toBe('/init/path.json');

      viewModel.setBackupFileLocation('/new/path.json');
      expect(settings.get_string('backup-file-location')).toBe('/new/path.json');
      expect(viewModel.backupFileLocation).toBe('/new/path.json');
    });
  });

  describe('synced components', () => {
    it('checks if a component is enabled', () => {
      settings.set_flags('synced-components', 1); // Only EXTENSIONS (1 << 0)
      expect(viewModel.isComponentSynced(DataProviderType.EXTENSIONS)).toBe(true);
      expect(viewModel.isComponentSynced(DataProviderType.KEYBINDINGS)).toBe(false);
      expect(viewModel.isComponentSynced(DataProviderType.TWEAKS)).toBe(false);
    });

    it('enables a previously disabled component', () => {
      settings.set_flags('synced-components', 1); // Only EXTENSIONS
      viewModel.setComponentSynced(DataProviderType.KEYBINDINGS, true);

      expect(viewModel.isComponentSynced(DataProviderType.KEYBINDINGS)).toBe(true);
      expect(viewModel.isComponentSynced(DataProviderType.EXTENSIONS)).toBe(true);
    });

    it('enabling an already enabled component keeps it enabled without duplicating', () => {
      settings.set_flags('synced-components', 1);
      viewModel.setComponentSynced(DataProviderType.EXTENSIONS, true);
      expect(viewModel.isComponentSynced(DataProviderType.EXTENSIONS)).toBe(true);
    });

    it('disables an enabled component', () => {
      settings.set_flags('synced-components', 3); // EXTENSIONS (1) | KEYBINDINGS (2)
      viewModel.setComponentSynced(DataProviderType.EXTENSIONS, false);

      expect(viewModel.isComponentSynced(DataProviderType.EXTENSIONS)).toBe(false);
      expect(viewModel.isComponentSynced(DataProviderType.KEYBINDINGS)).toBe(true);
    });
  });

  describe('general settings', () => {
    it('gets and sets show tray icon', () => {
      settings.set_boolean('show-tray-icon', true);
      expect(viewModel.showTrayIcon).toBe(true);

      viewModel.setShowTrayIcon(false);
      expect(settings.get_boolean('show-tray-icon')).toBe(false);
      expect(viewModel.showTrayIcon).toBe(false);
    });

    it('gets and sets show notifications', () => {
      settings.set_boolean('show-notifications', true);
      expect(viewModel.showNotifications).toBe(true);

      viewModel.setShowNotifications(false);
      expect(settings.get_boolean('show-notifications')).toBe(false);
      expect(viewModel.showNotifications).toBe(false);
    });
  });
});
