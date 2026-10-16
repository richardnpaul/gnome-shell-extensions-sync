import { SyncProviderType } from '@esync/api/types';
import { DataProviderType } from '@esync/data';
import { enumListToSettingsFlags, settingsFlagsToEnumList } from '@esync/utils';
import { Settings } from '@gi-types/gio2';
import { CredentialStorePort, CredentialType } from '@esync/core/ports';
import { InMemoryCredentialStore } from '@esync/platform/credentials/inMemoryCredentialStore';

export class PrefsViewModel {
  private settings: Settings;
  private credentialStore: CredentialStorePort;

  constructor(settings: Settings, credentialStore: CredentialStorePort = new InMemoryCredentialStore()) {
    this.settings = settings;
    this.credentialStore = credentialStore;
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

  async getRemoteId(provider: string): Promise<string> {
    const val = await this.credentialStore.getCredential(provider, CredentialType.REMOTE_ID);
    return val ?? '';
  }

  async setRemoteId(provider: string, id: string): Promise<void> {
    await this.credentialStore.setCredential(provider, CredentialType.REMOTE_ID, id);
  }

  async getToken(provider: string): Promise<string> {
    const val = await this.credentialStore.getCredential(provider, CredentialType.TOKEN);
    return val ?? '';
  }

  async setToken(provider: string, token: string): Promise<void> {
    await this.credentialStore.setCredential(provider, CredentialType.TOKEN, token);
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
