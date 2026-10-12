import { Github } from '@esync/api/providers/github';
import { Gitlab } from '@esync/api/providers/gitlab';
import { Data, SyncData } from '@esync/data';
import { _, getCurrentExtensionSettings, notify } from '@esync/shell';
import { format, logger } from '@esync/utils';
import { Settings } from '@gi-types/gio2';
import { EventEmitter } from 'events';
import { Local } from '@esync/api/providers/local';
import { CredentialStorePort, HttpTransportPort } from '@esync/core/ports';
import { SecretCredentialStore } from '@esync/platform/credentials/secretCredentialStore';
import { SyncProvider, SyncEvent, SyncOperationStatus, SyncProviderType } from '@esync/api/types';

const debug = logger('api');

export class Api {
  private provider: SyncProvider;
  private eventEmitter: EventEmitter;
  private settings: Settings;
  private data: Data;
  private httpTransport?: HttpTransportPort;
  private credentialStore: CredentialStorePort;
  private settingsChangedId?: number;

  constructor(
    eventEmitter: EventEmitter,
    data: Data,
    httpTransport?: HttpTransportPort,
    credentialStore?: CredentialStorePort,
  ) {
    this.data = data;
    this.httpTransport = httpTransport;
    this.credentialStore = credentialStore || new SecretCredentialStore();
    this.settings = getCurrentExtensionSettings();
    this.provider = this.createProvider();
    this.eventEmitter = eventEmitter;
    this.eventEmitter.on(SyncEvent.SAVE, this.save.bind(this));
    this.eventEmitter.on(SyncEvent.READ, this.read.bind(this));
    this.settingsChangedId = this.settings.connect('changed', this.updateProvider.bind(this));
  }

  destroy(): void {
    if (this.settings && this.settingsChangedId !== undefined) {
      this.settings.disconnect(this.settingsChangedId);
      this.settingsChangedId = undefined;
    }
  }

  async save(): Promise<void> {
    debug('got save request, saving settings...');
    try {
      const status: SyncOperationStatus = await this.provider.save({
        ...(await this.data.getSyncData()),
      });
      if (status === SyncOperationStatus.FAIL) {
        throw new Error(_('Could not save'));
      }
      debug(`saved settings to ${this.provider.getName()} successfully`);
      this.eventEmitter.emit(SyncEvent.SAVE_FINISHED, status);
      notify(format(_('Settings successfully saved to %s'), this.provider.getName()));
    } catch (ex) {
      this.eventEmitter.emit(SyncEvent.SAVE_FINISHED, undefined, ex);
      notify(format(_('Error occured while saving settings to %s. Please check the logs.'), this.provider.getName()));
      debug(`error occured during save. -> ${ex}`);
    }
  }

  async read(): Promise<void> {
    debug('got read request, reading settings...');
    try {
      const result: SyncData = await this.provider.read();
      debug(`read settings from ${this.provider.getName()} successfully`);
      this.eventEmitter.emit(SyncEvent.READ_FINISHED, result);
    } catch (ex) {
      this.eventEmitter.emit(SyncEvent.READ_FINISHED, undefined, ex);
      notify(
        format(_('Error occured while reading settings from %s. Please check the logs.'), this.provider.getName()),
      );
      debug(`error occured during read. -> ${ex}`);
    }
  }

  private createProvider(): SyncProvider {
    const providerType = this.settings.get_enum('provider') as SyncProviderType;
    debug(`changing provider to ${SyncProviderType[providerType]}`);

    switch (providerType) {
      case SyncProviderType.GITHUB:
        return this.createGithubProvider();
      case SyncProviderType.GITLAB:
        return this.createGitlabProvider();
      case SyncProviderType.LOCAL:
        return this.createLocalProvider();
      default:
        return this.createGithubProvider();
    }
  }

  private updateProvider(): void {
    this.provider = this.createProvider();
  }

  private createGithubProvider(): SyncProvider {
    return new Github(this.credentialStore, this.httpTransport);
  }

  private createGitlabProvider(): SyncProvider {
    return new Gitlab(this.credentialStore, this.httpTransport);
  }

  private createLocalProvider(): SyncProvider {
    const backupFileLocation = this.settings.get_string('backup-file-location');

    return new Local(backupFileLocation);
  }
}
