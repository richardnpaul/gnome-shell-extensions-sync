import { HttpTransportPort } from '@esync/core/ports';
import { SyncData } from '@esync/data';
import { Soup3Transport } from '@esync/platform/http/soup3Transport';
import { logger } from '@esync/utils';
import { SyncOperationStatus, SyncProvider } from '../types';

const debug = logger('github');

export class Github implements SyncProvider {
  private static GIST_API_URL = 'https://api.github.com/gists';

  private gistId: string;
  private userToken: string;
  private http: HttpTransportPort;

  constructor(gistId: string, userToken: string, http?: HttpTransportPort) {
    this.gistId = gistId;
    this.userToken = userToken;
    this.http = http || new Soup3Transport();
  }

  async save(syncData: SyncData): Promise<SyncOperationStatus> {
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
      url: `${Github.GIST_API_URL}/${this.gistId}`,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Authorization: `token ${this.userToken}`,
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
      url: `${Github.GIST_API_URL}/${this.gistId}`,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Authorization: `token ${this.userToken}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`failed to read data from ${this.getName()}. Server status: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error(`failed to read data from ${this.getName()}. Empty response`);
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
