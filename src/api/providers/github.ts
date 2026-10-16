import { CredentialStorePort, HttpTransportPort } from '@esync/core/ports';
import { SyncData } from '@esync/data';
import { Soup3Transport } from '@esync/platform/http/soup3Transport';
import { _ } from '@esync/shell';
import { format, logger } from '@esync/utils';
import { SyncOperationStatus, SyncProvider } from '../types';

const debug = logger('github');

export class Github implements SyncProvider {
  private static GIST_API_URL = 'https://api.github.com/gists';
  public readonly providerId: string = 'github';

  private credentialStore: CredentialStorePort;
  private http: HttpTransportPort;

  constructor(credentialStore: CredentialStorePort, http?: HttpTransportPort) {
    this.credentialStore = credentialStore;
    this.http = http || new Soup3Transport();
  }

  async save(syncData: SyncData): Promise<SyncOperationStatus> {
    const { token, remoteId } = await this.credentialStore.getProviderCredentials(this.providerId);
    if (!token || !remoteId) {
      throw new Error(format(_('failed to save data to %s. Missing credentials'), this.getName()));
    }

    const files = Object.keys(syncData).reduce((acc, key) => {
      return {
        ...acc,
        [key]: {
          content: JSON.stringify(syncData[key]),
        },
      };
    }, {});

    const requestBody = JSON.stringify({
      description: 'Extensions Sync',
      files,
    });

    const response = await this.http.request({
      method: 'PATCH',
      url: `${Github.GIST_API_URL}/${remoteId}`,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Authorization: `token ${token}`,
      },
      body: requestBody,
    });

    if (response.status !== 200) {
      throw new Error(format(_('failed to save data to %s. Server status: %s'), this.getName(), response.statusText));
    }

    return SyncOperationStatus.SUCCESS;
  }

  async read(): Promise<SyncData> {
    const { token, remoteId } = await this.credentialStore.getProviderCredentials(this.providerId);
    if (!token || !remoteId) {
      throw new Error(format(_('failed to read data from %s. Missing credentials'), this.getName()));
    }

    const response = await this.http.request({
      method: 'GET',
      url: `${Github.GIST_API_URL}/${remoteId}`,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Authorization: `token ${token}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(format(_('failed to read data from %s. Server status: %s'), this.getName(), response.statusText));
    }

    if (!response.body) {
      throw new Error(format(_('failed to read data from %s. Empty response'), this.getName()));
    }

    const body = JSON.parse(response.body);

    const syncData: SyncData = Object.keys(body.files).reduce(
      (acc, key) => {
        try {
          return {
            ...acc,
            [key]: JSON.parse(body.files[key].content),
          };
        } catch {
          debug(`failed to parse ${key} file. skipping it...`);
          return acc;
        }
      },
      { extensions: {}, keybindings: {}, tweaks: {} },
    );

    return syncData;
  }

  getName(): string {
    return 'Github';
  }
}
