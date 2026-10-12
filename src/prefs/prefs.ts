import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { SyncProviderType } from '@esync/api/types';
import { DataProviderType } from '@esync/data';

const _ = (str: string): string => str;

export default class ExtensionsSyncPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window: any): void {
    const settings = this.getSettings();
    window._settings = settings;

    // --- Provider Page ---
    const providerPage = new Adw.PreferencesPage({
      title: _('Provider'),
      icon_name: 'network-server-symbolic',
    });

    const providerSelectionGroup = new Adw.PreferencesGroup({
      title: _('Sync Provider'),
      description: _('Select the cloud or local service to sync your settings with.'),
    });

    const providerComboRow = new Adw.ComboRow({
      title: _('Provider'),
    });
    providerComboRow.set_model(
      new Gtk.StringList({
        strings: [_('GitHub'), _('GitLab'), _('Local')],
      }),
    );

    const activeProvider = settings.get_enum('provider');
    providerComboRow.set_selected(activeProvider);

    providerSelectionGroup.add(providerComboRow);
    providerPage.add(providerSelectionGroup);

    // GitHub Group
    const githubGroup = new Adw.PreferencesGroup({
      title: _('GitHub Settings'),
      description: _('Create a secret Gist on gist.github.com and generate a personal access token.'),
    });
    const gistIdRow = new Adw.EntryRow({
      title: _('Gist ID'),
      text: settings.get_string('github-gist-id'),
    });
    gistIdRow.connect('changed', (row: any) => {
      settings.set_string('github-gist-id', row.get_text());
    });
    githubGroup.add(gistIdRow);

    const githubTokenRow = new Adw.PasswordEntryRow({
      title: _('GitHub Token'),
      text: settings.get_string('github-user-token'),
    });
    githubTokenRow.connect('changed', (row: any) => {
      settings.set_string('github-user-token', row.get_text());
    });
    githubGroup.add(githubTokenRow);
    providerPage.add(githubGroup);

    // GitLab Group
    const gitlabGroup = new Adw.PreferencesGroup({
      title: _('GitLab Settings'),
      description: _('Create a private snippet on gitlab.com and generate an access token.'),
    });
    const snippetIdRow = new Adw.EntryRow({
      title: _('Snippet ID'),
      text: settings.get_string('gitlab-snippet-id'),
    });
    snippetIdRow.connect('changed', (row: any) => {
      settings.set_string('gitlab-snippet-id', row.get_text());
    });
    gitlabGroup.add(snippetIdRow);

    const gitlabTokenRow = new Adw.PasswordEntryRow({
      title: _('GitLab Token'),
      text: settings.get_string('gitlab-user-token'),
    });
    gitlabTokenRow.connect('changed', (row: any) => {
      settings.set_string('gitlab-user-token', row.get_text());
    });
    gitlabGroup.add(gitlabTokenRow);
    providerPage.add(gitlabGroup);

    // Local Group
    const localGroup = new Adw.PreferencesGroup({
      title: _('Local Backup Settings'),
      description: _('Save and restore your configuration to/from a local JSON file.'),
    });

    const currentBackupLocation = settings.get_string('backup-file-location');
    const backupFileRow = new Adw.ActionRow({
      title: _('Backup File Location'),
      subtitle: currentBackupLocation || _('No file selected'),
    });

    const filePickerButton = new Gtk.Button({
      label: _('Browse…'),
      valign: Gtk.Align.CENTER,
    });

    filePickerButton.connect('clicked', () => {
      const fileDialog = new Gtk.FileDialog({
        title: _('Select Backup File Location'),
        initial_name: 'extensions-sync-backup.json',
      });
      const filter = new Gtk.FileFilter();
      filter.set_name('JSON files (*.json)');
      filter.add_pattern('*.json');
      const filters = new Gio.ListStore({ item_type: Gtk.FileFilter });
      filters.append(filter);
      fileDialog.set_filters(filters);
      fileDialog.set_default_filter(filter);

      fileDialog.save(window, null, (dialog: any, res: any) => {
        try {
          const file = dialog.save_finish(res);
          if (!file.query_exists(null)) {
            file.create(Gio.FileCreateFlags.PRIVATE, null);
          }
          const uri = file.get_uri();
          backupFileRow.set_subtitle(uri);
          settings.set_string('backup-file-location', uri);
        } catch {
          // File choosing was cancelled
        }
      });
    });

    backupFileRow.add_suffix(filePickerButton);
    backupFileRow.set_activatable_widget(filePickerButton);
    localGroup.add(backupFileRow);
    providerPage.add(localGroup);

    // Update visibility of provider groups
    const updateProviderVisibility = (selected: number) => {
      githubGroup.set_visible(selected === SyncProviderType.GITHUB);
      gitlabGroup.set_visible(selected === SyncProviderType.GITLAB);
      localGroup.set_visible(selected === SyncProviderType.LOCAL);
    };

    updateProviderVisibility(activeProvider);

    providerComboRow.connect('notify::selected', (row: any) => {
      const selected = row.selected;
      settings.set_enum('provider', selected);
      updateProviderVisibility(selected);
    });

    window.add(providerPage);

    // --- Synced Data Page ---
    const syncedDataPage = new Adw.PreferencesPage({
      title: _('Synced Data'),
      icon_name: 'emblem-synchronized-symbolic',
    });

    const syncedDataGroup = new Adw.PreferencesGroup({
      title: _('Synchronized Components'),
      description: _('Choose which components will be uploaded and downloaded.'),
    });

    const dataProviderTypes = [
      {
        type: DataProviderType.EXTENSIONS,
        title: _('Extensions'),
        subtitle: _('Sync all user extensions and their dconf configurations'),
      },
      {
        type: DataProviderType.KEYBINDINGS,
        title: _('Keybindings'),
        subtitle: _('Sync all GNOME Shell and GTK window/media keybindings'),
      },
      {
        type: DataProviderType.TWEAKS,
        title: _('Tweaks'),
        subtitle: _('Sync GNOME desktop theme, font, interface and tweak settings'),
      },
    ];

    dataProviderTypes.forEach(({ type, title, subtitle }) => {
      const currentFlags = settings.get_flags('data-providers');
      const isEnabled = (currentFlags & (1 << type)) !== 0;

      const switchRow = new Adw.SwitchRow({
        title,
        subtitle,
        active: isEnabled,
      });

      switchRow.connect('notify::active', (row: any) => {
        let flags = settings.get_flags('data-providers');
        if (row.active) {
          flags |= 1 << type;
        } else {
          flags &= ~(1 << type);
        }
        settings.set_flags('data-providers', flags);
      });

      syncedDataGroup.add(switchRow);
    });

    syncedDataPage.add(syncedDataGroup);
    window.add(syncedDataPage);

    // --- General / Other Settings Page ---
    const generalPage = new Adw.PreferencesPage({
      title: _('General'),
      icon_name: 'preferences-system-symbolic',
    });

    const generalGroup = new Adw.PreferencesGroup({
      title: _('Behavior and Interface'),
    });

    const trayIconRow = new Adw.SwitchRow({
      title: _('Show Tray Icon'),
      subtitle: _('Display the sync status icon in the top panel'),
    });
    settings.bind('show-tray-icon', trayIconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    generalGroup.add(trayIconRow);

    const notificationsRow = new Adw.SwitchRow({
      title: _('Show Notifications'),
      subtitle: _('Display desktop notifications on sync progress and errors'),
    });
    settings.bind('show-notifications', notificationsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    generalGroup.add(notificationsRow);

    generalPage.add(generalGroup);
    window.add(generalPage);
  }
}
