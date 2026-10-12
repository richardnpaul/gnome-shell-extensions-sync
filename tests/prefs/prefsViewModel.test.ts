import { describe, it, expect, beforeEach } from 'vitest';
import { PrefsViewModel } from '@esync/prefs/prefsViewModel';
import { SyncProviderType } from '@esync/api/types';
import { DataProviderType } from '@esync/data';
import { Settings } from '@gi-types/gio2';

describe('PrefsViewModel', () => {
  let settings: Settings;
  let viewModel: PrefsViewModel;

  beforeEach(() => {
    settings = new Settings('org.gnome.shell.extensions.extensions-sync');
    viewModel = new PrefsViewModel(settings);
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

  describe('github credentials', () => {
    it('gets and sets github gist id and token', () => {
      settings.set_string('github-gist-id', 'init-gist');
      settings.set_string('github-user-token', 'init-token');

      expect(viewModel.githubGistId).toBe('init-gist');
      expect(viewModel.githubUserToken).toBe('init-token');

      viewModel.setGithubGistId('new-gist');
      viewModel.setGithubUserToken('new-token');

      expect(settings.get_string('github-gist-id')).toBe('new-gist');
      expect(settings.get_string('github-user-token')).toBe('new-token');
      expect(viewModel.githubGistId).toBe('new-gist');
      expect(viewModel.githubUserToken).toBe('new-token');
    });
  });

  describe('gitlab credentials', () => {
    it('gets and sets gitlab snippet id and token', () => {
      settings.set_string('gitlab-snippet-id', 'init-snippet');
      settings.set_string('gitlab-user-token', 'init-token');

      expect(viewModel.gitlabSnippetId).toBe('init-snippet');
      expect(viewModel.gitlabUserToken).toBe('init-token');

      viewModel.setGitlabSnippetId('new-snippet');
      viewModel.setGitlabUserToken('new-token');

      expect(settings.get_string('gitlab-snippet-id')).toBe('new-snippet');
      expect(settings.get_string('gitlab-user-token')).toBe('new-token');
      expect(viewModel.gitlabSnippetId).toBe('new-snippet');
      expect(viewModel.gitlabUserToken).toBe('new-token');
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
    it('checks component sync status', () => {
      // 1 << EXTENSIONS (1 << 0 = 1)
      settings.set_flags('synced-components', 1);
      expect(viewModel.isComponentSynced(DataProviderType.EXTENSIONS)).toBe(true);
      expect(viewModel.isComponentSynced(DataProviderType.KEYBINDINGS)).toBe(false);
      expect(viewModel.isComponentSynced(DataProviderType.TWEAKS)).toBe(false);
    });

    it('enables and disables components properly', () => {
      settings.set_flags('synced-components', 0);

      // Enable EXTENSIONS
      viewModel.setComponentSynced(DataProviderType.EXTENSIONS, true);
      expect(viewModel.isComponentSynced(DataProviderType.EXTENSIONS)).toBe(true);

      // Enable EXTENSIONS again (already enabled, no duplicate)
      viewModel.setComponentSynced(DataProviderType.EXTENSIONS, true);
      expect(viewModel.isComponentSynced(DataProviderType.EXTENSIONS)).toBe(true);

      // Enable KEYBINDINGS
      viewModel.setComponentSynced(DataProviderType.KEYBINDINGS, true);
      expect(viewModel.isComponentSynced(DataProviderType.KEYBINDINGS)).toBe(true);
      expect(viewModel.isComponentSynced(DataProviderType.EXTENSIONS)).toBe(true);

      // Disable EXTENSIONS
      viewModel.setComponentSynced(DataProviderType.EXTENSIONS, false);
      expect(viewModel.isComponentSynced(DataProviderType.EXTENSIONS)).toBe(false);
      expect(viewModel.isComponentSynced(DataProviderType.KEYBINDINGS)).toBe(true);

      // Disable EXTENSIONS again (already disabled)
      viewModel.setComponentSynced(DataProviderType.EXTENSIONS, false);
      expect(viewModel.isComponentSynced(DataProviderType.EXTENSIONS)).toBe(false);
    });
  });

  describe('general settings', () => {
    it('gets and sets showTrayIcon', () => {
      settings.set_boolean('show-tray-icon', true);
      expect(viewModel.showTrayIcon).toBe(true);

      viewModel.setShowTrayIcon(false);
      expect(settings.get_boolean('show-tray-icon')).toBe(false);
      expect(viewModel.showTrayIcon).toBe(false);
    });

    it('gets and sets showNotifications', () => {
      settings.set_boolean('show-notifications', true);
      expect(viewModel.showNotifications).toBe(true);

      viewModel.setShowNotifications(false);
      expect(settings.get_boolean('show-notifications')).toBe(false);
      expect(viewModel.showNotifications).toBe(false);
    });
  });
});
