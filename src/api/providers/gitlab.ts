import { HttpTransportPort } from '@esync/core/ports';
import { SyncData } from '@esync/data';
import { Soup3Transport } from '@esync/platform/http/soup3Transport';
import { SyncOperationStatus, SyncProvider } from '../types';

export class Gitlab implements SyncProvider {
  private static SNIPPETS_API_URL = 'https://gitlab.com/api/v4/snippets';

  private snippetId: string;
  private userToken: string;
  private http: HttpTransportPort;

  constructor(snippetId: string, userToken: string, http?: HttpTransportPort) {
    this.snippetId = snippetId;
    this.userToken = userToken;
    this.http = http || new Soup3Transport();
  }

  async save(syncData: SyncData): Promise<SyncOperationStatus> {
    const requestBody = JSON.stringify({
      title: 'Extensions Sync',
      content: JSON.stringify(syncData),
    });

    const response = await this.http.request({
      method: 'PUT',
      url: `${Gitlab.SNIPPETS_API_URL}/${this.snippetId}`,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'PRIVATE-TOKEN': `${this.userToken}`,
      },
      body: requestBody,
    });

    if (response.status !== 200) {
      throw new Error(`failed to save data to ${this.getName()}. Server status: ${response.statusText}`);
    }

    return SyncOperationStatus.SUCCESS;
  }

  async read(): Promise<SyncData> {
    const response = await this.http.request({
      method: 'GET',
      url: `${Gitlab.SNIPPETS_API_URL}/${this.snippetId}/raw`,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'PRIVATE-TOKEN': `${this.userToken}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`failed to read data from ${this.getName()}. Server status: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error(`failed to read data from ${this.getName()}. Empty response`);
    }

    const syncData = JSON.parse(response.body);

    return syncData;
  }

  getName(): string {
    return 'Gitlab';
  }
}
