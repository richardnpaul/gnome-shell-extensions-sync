import { SyncProviderType } from '@esync/api/types';
import { DataProviderType } from '@esync/data';
import { enumListToSettingsFlags, settingsFlagsToEnumList } from '@esync/utils';
import { Settings } from '@gi-types/gio2';

export class PrefsViewModel {
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  get provider(): SyncProviderType {
    return this.settings.get_enum('provider');
  }

  setProvider(provider: SyncProviderType): void {
    this.settings.set_enum('provider', provider);
  }

  isProviderActive(provider: SyncProviderType): boolean {
    return this.provider === provider;
  }

  get githubGistId(): string {
    return this.settings.get_string('github-gist-id');
  }

  setGithubGistId(id: string): void {
    this.settings.set_string('github-gist-id', id);
  }

  get githubUserToken(): string {
    return this.settings.get_string('github-user-token');
  }

  setGithubUserToken(token: string): void {
    this.settings.set_string('github-user-token', token);
  }

  get gitlabSnippetId(): string {
    return this.settings.get_string('gitlab-snippet-id');
  }

  setGitlabSnippetId(id: string): void {
    this.settings.set_string('gitlab-snippet-id', id);
  }

  get gitlabUserToken(): string {
    return this.settings.get_string('gitlab-user-token');
  }

  setGitlabUserToken(token: string): void {
    this.settings.set_string('gitlab-user-token', token);
  }

  get backupFileLocation(): string {
    return this.settings.get_string('backup-file-location');
  }

  setBackupFileLocation(location: string): void {
    this.settings.set_string('backup-file-location', location);
  }

  isComponentSynced(type: DataProviderType): boolean {
    const flags = this.settings.get_flags('synced-components');
    const enabledTypes = settingsFlagsToEnumList(flags);
    return enabledTypes.includes(type);
  }

  setComponentSynced(type: DataProviderType, enabled: boolean): void {
    const flags = this.settings.get_flags('synced-components');
    let enabledTypes = settingsFlagsToEnumList(flags);

    if (enabled && !enabledTypes.includes(type)) {
      enabledTypes.push(type);
    } else if (!enabled) {
      enabledTypes = enabledTypes.filter((t) => t !== type);
    }

    this.settings.set_flags('synced-components', enumListToSettingsFlags(enabledTypes));
  }

  get showTrayIcon(): boolean {
    return this.settings.get_boolean('show-tray-icon');
  }

  setShowTrayIcon(show: boolean): void {
    this.settings.set_boolean('show-tray-icon', show);
  }

  get showNotifications(): boolean {
    return this.settings.get_boolean('show-notifications');
  }

  setShowNotifications(show: boolean): void {
    this.settings.set_boolean('show-notifications', show);
  }
}
