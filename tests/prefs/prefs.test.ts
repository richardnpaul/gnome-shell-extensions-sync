import { describe, it, expect, beforeEach, vi } from 'vitest';
import ExtensionsSyncPreferences from '@esync/prefs/prefs';
import { SyncProviderType } from '@esync/api/types';
import { DataProviderType } from '@esync/data';
import { Settings } from '@gi-types/gio2';
import { InMemoryCredentialStore } from '@esync/platform/credentials/inMemoryCredentialStore';
import { CredentialType } from '@esync/core/ports';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';

describe('prefs/prefs', () => {
  let prefs: ExtensionsSyncPreferences;
  let mockSettings: Settings;
  let mockCredentialStore: InMemoryCredentialStore;
  let mockWindow: { pages: any[]; add: (p: any) => void; _settings?: any; _credentialStore?: any };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSettings = new Settings({
      provider: SyncProviderType.GITHUB,
      'github-gist-id': '',
      'github-user-token': '',
      'gitlab-snippet-id': '',
      'gitlab-user-token': '',
      'backup-file-location': 'file:///backup.json',
      'data-providers': 7, // 1 | 2 | 4
    });
    mockCredentialStore = new InMemoryCredentialStore();
    await mockCredentialStore.setCredential('github', CredentialType.REMOTE_ID, 'my-gist');
    await mockCredentialStore.setCredential('github', CredentialType.TOKEN, 'my-gh-token');
    await mockCredentialStore.setCredential('gitlab', CredentialType.REMOTE_ID, 'my-snippet');
    await mockCredentialStore.setCredential('gitlab', CredentialType.TOKEN, 'my-gl-token');

    mockWindow = {
      pages: [],
      add(p: any) {
        this.pages.push(p);
      },
      _credentialStore: mockCredentialStore,
    };
    prefs = new ExtensionsSyncPreferences(mockSettings);
  });

  it('builds preferences window with 3 pages and assigns _settings', async () => {
    const initTranslationsSpy = vi.spyOn(prefs, 'initTranslations');
    await prefs.fillPreferencesWindow(mockWindow);

    expect(initTranslationsSpy).toHaveBeenCalled();
    expect(mockWindow._settings).toBe(mockSettings);
    expect(mockWindow.pages.length).toBe(3);

    // Page 0: Provider
    const providerPage = mockWindow.pages[0];
    expect(providerPage.title).toBe('Provider');
    expect(providerPage.icon_name).toBe('network-server-symbolic');

    const providerSelectionGroup = providerPage.groups[0];
    expect(providerSelectionGroup.title).toBe('Sync Provider');
    expect(providerSelectionGroup.description).toBe('Select the cloud or local service to sync your settings with.');
    const comboRow = providerSelectionGroup.rows[0];
    expect(comboRow.title).toBe('Provider');
    expect(comboRow.model.strings).toEqual(['GitHub', 'GitLab', 'Local']);
    expect(comboRow.selected).toBe(SyncProviderType.GITHUB);

    const githubGroup = providerPage.groups[1];
    expect(githubGroup.title).toBe('GitHub Settings');
    expect(githubGroup.description).toBe(
      'Create a secret Gist on gist.github.com and generate a personal access token.',
    );
    expect(githubGroup.rows[0].title).toBe('Gist ID');
    expect(githubGroup.rows[0].text).toBe('my-gist');
    expect(githubGroup.rows[1].title).toBe('GitHub Token');
    expect(githubGroup.rows[1].text).toBe('my-gh-token');

    const gitlabGroup = providerPage.groups[2];
    expect(gitlabGroup.title).toBe('GitLab Settings');
    expect(gitlabGroup.description).toBe('Create a private snippet on gitlab.com and generate an access token.');
    expect(gitlabGroup.rows[0].title).toBe('Snippet ID');
    expect(gitlabGroup.rows[0].text).toBe('my-snippet');
    expect(gitlabGroup.rows[1].title).toBe('GitLab Token');
    expect(gitlabGroup.rows[1].text).toBe('my-gl-token');

    const localGroup = providerPage.groups[3];
    expect(localGroup.title).toBe('Local Backup Settings');
    expect(localGroup.description).toBe('Save and restore your configuration to/from a local JSON file.');
    const backupRow = localGroup.rows[0];
    expect(backupRow.title).toBe('Backup File Location');
    expect(backupRow.subtitle).toBe('file:///backup.json');
    expect(backupRow.suffix.label).toBe('Browse…');
    expect(backupRow.suffix.valign).toBe(Gtk.Align.CENTER);
    expect(backupRow.activatableWidget).toBe(backupRow.suffix);

    // Page 1: Synced Data
    const syncedPage = mockWindow.pages[1];
    expect(syncedPage.title).toBe('Synced Data');
    expect(syncedPage.icon_name).toBe('emblem-synchronized-symbolic');

    const syncedGroup = syncedPage.groups[0];
    expect(syncedGroup.title).toBe('Synchronized Components');
    expect(syncedGroup.description).toBe('Choose which components will be uploaded and downloaded.');
    expect(syncedGroup.rows[0].title).toBe('Extensions');
    expect(syncedGroup.rows[0].subtitle).toBe('Sync all user extensions and their dconf configurations');
    expect(syncedGroup.rows[1].title).toBe('Keybindings');
    expect(syncedGroup.rows[1].subtitle).toBe('Sync all GNOME Shell and GTK window/media keybindings');
    expect(syncedGroup.rows[2].title).toBe('Tweaks');
    expect(syncedGroup.rows[2].subtitle).toBe('Sync GNOME desktop theme, font, interface and tweak settings');

    // Page 2: General
    const generalPage = mockWindow.pages[2];
    expect(generalPage.title).toBe('General');
    expect(generalPage.icon_name).toBe('preferences-system-symbolic');

    const generalGroup = generalPage.groups[0];
    expect(generalGroup.title).toBe('Behavior and Interface');
    expect(generalGroup.rows[0].title).toBe('Show Tray Icon');
    expect(generalGroup.rows[0].subtitle).toBe('Display the sync status icon in the top panel');
    expect(generalGroup.rows[1].title).toBe('Show Notifications');
    expect(generalGroup.rows[1].subtitle).toBe('Display desktop notifications on sync progress and errors');
  });

  it('defaults to SecretCredentialStore and empty entry rows when window._credentialStore is omitted', async () => {
    delete mockWindow._credentialStore;
    await prefs.fillPreferencesWindow(mockWindow);
    expect(mockWindow._credentialStore).toBeDefined();

    const providerPage = mockWindow.pages[0];
    const githubGroup = providerPage.groups[1];
    expect(githubGroup.rows[0].text).toBe('');
    expect(githubGroup.rows[1].text).toBe('');

    const gitlabGroup = providerPage.groups[2];
    expect(gitlabGroup.rows[0].text).toBe('');
    expect(gitlabGroup.rows[1].text).toBe('');
  });

  describe('provider selection and visibility', () => {
    it('sets initial visibility based on activeProvider (GITHUB)', async () => {
      await prefs.fillPreferencesWindow(mockWindow);

      const providerPage = mockWindow.pages[0];
      const githubGroup = providerPage.groups[1];
      const gitlabGroup = providerPage.groups[2];
      const localGroup = providerPage.groups[3];

      expect(githubGroup.visible).toBe(true);
      expect(gitlabGroup.visible).toBe(false);
      expect(localGroup.visible).toBe(false);
    });

    it('sets initial visibility based on activeProvider (GITLAB)', async () => {
      mockSettings.set_enum('provider', SyncProviderType.GITLAB);
      await prefs.fillPreferencesWindow(mockWindow);

      const providerPage = mockWindow.pages[0];
      const comboRow = providerPage.groups[0].rows[0];
      const githubGroup = providerPage.groups[1];
      const gitlabGroup = providerPage.groups[2];
      const localGroup = providerPage.groups[3];

      expect(comboRow.selected).toBe(SyncProviderType.GITLAB);
      expect(githubGroup.visible).toBe(false);
      expect(gitlabGroup.visible).toBe(true);
      expect(localGroup.visible).toBe(false);
    });

    it('updates visibility and setting when combo selection changes to GITLAB', async () => {
      await prefs.fillPreferencesWindow(mockWindow);

      const providerPage = mockWindow.pages[0];
      const providerSelectionGroup = providerPage.groups[0];
      const comboRow = providerSelectionGroup.rows[0];

      const githubGroup = providerPage.groups[1];
      const gitlabGroup = providerPage.groups[2];
      const localGroup = providerPage.groups[3];

      // Change to GitLab
      comboRow.selected = SyncProviderType.GITLAB;
      comboRow.signals['notify::selected'](comboRow);

      expect(mockSettings.get_enum('provider')).toBe(SyncProviderType.GITLAB);
      expect(githubGroup.visible).toBe(false);
      expect(gitlabGroup.visible).toBe(true);
      expect(localGroup.visible).toBe(false);
    });

    it('updates visibility and setting when combo selection changes to LOCAL', async () => {
      await prefs.fillPreferencesWindow(mockWindow);

      const providerPage = mockWindow.pages[0];
      const comboRow = providerPage.groups[0].rows[0];

      comboRow.selected = SyncProviderType.LOCAL;
      comboRow.signals['notify::selected'](comboRow);

      expect(mockSettings.get_enum('provider')).toBe(SyncProviderType.LOCAL);
      expect(providerPage.groups[1].visible).toBe(false);
      expect(providerPage.groups[2].visible).toBe(false);
      expect(providerPage.groups[3].visible).toBe(true);
    });
  });

  describe('credential entry rows', () => {
    it('updates GitHub credentials in credentialStore on entry changed', async () => {
      await prefs.fillPreferencesWindow(mockWindow);

      const githubGroup = mockWindow.pages[0].groups[1];
      const gistIdRow = githubGroup.rows[0];
      const tokenRow = githubGroup.rows[1];

      gistIdRow.text = 'new-gist-id';
      gistIdRow.signals.changed(gistIdRow);
      expect(await mockCredentialStore.getCredential('github', CredentialType.REMOTE_ID)).toBe('new-gist-id');

      tokenRow.text = 'new-gh-token';
      tokenRow.signals.changed(tokenRow);
      expect(await mockCredentialStore.getCredential('github', CredentialType.TOKEN)).toBe('new-gh-token');
    });

    it('updates GitLab credentials in credentialStore on entry changed', async () => {
      await prefs.fillPreferencesWindow(mockWindow);

      const gitlabGroup = mockWindow.pages[0].groups[2];
      const snippetIdRow = gitlabGroup.rows[0];
      const tokenRow = gitlabGroup.rows[1];

      snippetIdRow.text = 'new-snippet-id';
      snippetIdRow.signals.changed(snippetIdRow);
      expect(await mockCredentialStore.getCredential('gitlab', CredentialType.REMOTE_ID)).toBe('new-snippet-id');

      tokenRow.text = 'new-gl-token';
      tokenRow.signals.changed(tokenRow);
      expect(await mockCredentialStore.getCredential('gitlab', CredentialType.TOKEN)).toBe('new-gl-token');
    });
  });

  describe('local file picker dialog', () => {
    it('shows No file selected if backup location is empty', async () => {
      mockSettings.set_string('backup-file-location', '');
      await prefs.fillPreferencesWindow(mockWindow);

      const localGroup = mockWindow.pages[0].groups[3];
      const backupFileRow = localGroup.rows[0];
      expect(backupFileRow.subtitle).toBe('No file selected');
    });

    it('handles file selection from file dialog when file does not exist', async () => {
      await prefs.fillPreferencesWindow(mockWindow);

      const localGroup = mockWindow.pages[0].groups[3];
      const backupFileRow = localGroup.rows[0];
      const filePickerButton = backupFileRow.suffix;

      const mockSelectedFile = {
        query_exists: vi.fn().mockReturnValue(false),
        create: vi.fn(),
        get_uri: vi.fn().mockReturnValue('file:///new/backup.json'),
      };
      (Gtk.FileDialog as any).mockResultFile = mockSelectedFile;
      (Gtk.FileDialog as any).shouldThrow = false;

      filePickerButton.signals.clicked();

      const dialog = Gtk.FileDialog.lastInstance!;
      expect(dialog.title).toBe('Select Backup File Location');
      expect(dialog.initial_name).toBe('extensions-sync-backup.json');
      expect(dialog.filters.item_type).toBe(Gtk.FileFilter);
      expect(dialog.filters.items[0].name).toBe('JSON files (*.json)');
      expect(dialog.filters.items[0].patterns).toEqual(['*.json']);
      expect(dialog.defaultFilter).toBe(dialog.filters.items[0]);

      expect(mockSelectedFile.create).toHaveBeenCalledWith(Gio.FileCreateFlags.PRIVATE, null);
      expect(mockSettings.get_string('backup-file-location')).toBe('file:///new/backup.json');
      expect(backupFileRow.subtitle).toBe('file:///new/backup.json');
    });

    it('handles file selection when file already exists', async () => {
      await prefs.fillPreferencesWindow(mockWindow);

      const localGroup = mockWindow.pages[0].groups[3];
      const backupFileRow = localGroup.rows[0];
      const filePickerButton = backupFileRow.suffix;

      const mockSelectedFile = {
        query_exists: vi.fn().mockReturnValue(true),
        create: vi.fn(),
        get_uri: vi.fn().mockReturnValue('file:///existing/backup.json'),
      };
      (Gtk.FileDialog as any).mockResultFile = mockSelectedFile;
      (Gtk.FileDialog as any).shouldThrow = false;

      filePickerButton.signals.clicked();

      expect(mockSelectedFile.create).not.toHaveBeenCalled();
      expect(mockSettings.get_string('backup-file-location')).toBe('file:///existing/backup.json');
      expect(backupFileRow.subtitle).toBe('file:///existing/backup.json');
    });

    it('handles cancelled file selection gracefully', async () => {
      await prefs.fillPreferencesWindow(mockWindow);

      const localGroup = mockWindow.pages[0].groups[3];
      const backupFileRow = localGroup.rows[0];
      const filePickerButton = backupFileRow.suffix;

      (Gtk.FileDialog as any).mockResultFile = null;
      (Gtk.FileDialog as any).shouldThrow = true;

      expect(() => filePickerButton.signals.clicked()).not.toThrow();
    });
  });

  describe('synced data components switches', () => {
    it('initializes switches and updates flags when toggled on and off', async () => {
      mockSettings.set_flags('data-providers', 1); // Only EXTENSIONS active
      await prefs.fillPreferencesWindow(mockWindow);

      const syncedPage = mockWindow.pages[1];
      const switchesGroup = syncedPage.groups[0];

      const extSwitch = switchesGroup.rows[0];
      const keySwitch = switchesGroup.rows[1];
      const tweakSwitch = switchesGroup.rows[2];

      expect(extSwitch.active).toBe(true);
      expect(keySwitch.active).toBe(false);
      expect(tweakSwitch.active).toBe(false);

      // Toggle KEYBINDINGS on
      keySwitch.active = true;
      keySwitch.signals['notify::active'](keySwitch);
      expect(mockSettings.get_flags('data-providers')).toBe(1 | (1 << DataProviderType.KEYBINDINGS));

      // Toggle EXTENSIONS off
      extSwitch.active = false;
      extSwitch.signals['notify::active'](extSwitch);
      expect(mockSettings.get_flags('data-providers')).toBe(1 << DataProviderType.KEYBINDINGS);
    });
  });

  describe('general page settings binding', () => {
    it('binds show-tray-icon and show-notifications', async () => {
      await prefs.fillPreferencesWindow(mockWindow);

      const generalPage = mockWindow.pages[2];
      const generalGroup = generalPage.groups[0];
      const trayIconRow = generalGroup.rows[0];
      const notificationsRow = generalGroup.rows[1];

      expect(mockSettings.bind).toHaveBeenCalledWith(
        'show-tray-icon',
        trayIconRow,
        'active',
        Gio.SettingsBindFlags.DEFAULT,
      );
      expect(mockSettings.bind).toHaveBeenCalledWith(
        'show-notifications',
        notificationsRow,
        'active',
        Gio.SettingsBindFlags.DEFAULT,
      );
    });
  });
});
