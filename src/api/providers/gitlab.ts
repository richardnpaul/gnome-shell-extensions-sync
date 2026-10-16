import { CredentialStorePort, HttpTransportPort } from '@esync/core/ports';
import { SyncData } from '@esync/data';
import { Soup3Transport } from '@esync/platform/http/soup3Transport';
import { _ } from '@esync/shell';
import { format } from '@esync/utils';
import { SyncOperationStatus, SyncProvider } from '../types';

export class Gitlab implements SyncProvider {
  private static SNIPPETS_API_URL = 'https://gitlab.com/api/v4/snippets';
  public readonly providerId: string = 'gitlab';

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

    const requestBody = JSON.stringify({
      title: 'Extensions Sync',
      content: JSON.stringify(syncData),
    });

    const response = await this.http.request({
      method: 'PUT',
      url: `${Gitlab.SNIPPETS_API_URL}/${remoteId}`,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'PRIVATE-TOKEN': `${token}`,
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
      url: `${Gitlab.SNIPPETS_API_URL}/${remoteId}/raw`,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'PRIVATE-TOKEN': `${token}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(format(_('failed to read data from %s. Server status: %s'), this.getName(), response.statusText));
    }

    if (!response.body) {
      throw new Error(format(_('failed to read data from %s. Empty response'), this.getName()));
    }

    const syncData = JSON.parse(response.body);

    return syncData;
  }

  getName(): string {
    return 'Gitlab';
  }
}
