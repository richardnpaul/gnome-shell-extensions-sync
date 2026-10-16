/* eslint-disable @typescript-eslint/no-explicit-any */
import { CredentialStorePort, CredentialType } from '@esync/core/ports';
import { logger } from '@esync/utils';

const debug = logger('credentialMigration');

interface LegacyKeyMapping {
  key: string;
  provider: string;
  type: CredentialType;
}

const LEGACY_MAPPINGS: LegacyKeyMapping[] = [
  { key: 'github-user-token', provider: 'github', type: CredentialType.TOKEN },
  { key: 'github-gist-id', provider: 'github', type: CredentialType.REMOTE_ID },
  { key: 'gitlab-user-token', provider: 'gitlab', type: CredentialType.TOKEN },
  { key: 'gitlab-snippet-id', provider: 'gitlab', type: CredentialType.REMOTE_ID },
];

export class CredentialMigrator {
  private settings: any;
  private credentialStore: CredentialStorePort;

  constructor(settings: any, credentialStore: CredentialStorePort) {
    this.settings = settings;
    this.credentialStore = credentialStore;
  }

  async migrate(): Promise<void> {
    for (const mapping of LEGACY_MAPPINGS) {
      try {
        const val = this.settings.get_string(mapping.key);
        if (val && val.trim().length > 0) {
          await this.credentialStore.setCredential(mapping.provider, mapping.type, val.trim());
          this.settings.reset(mapping.key);
          debug(`Migrated legacy key ${mapping.key} to ${mapping.provider}:${mapping.type}`);
        }
      } catch (error) {
        debug(`Failed to migrate legacy key ${mapping.key}: ${error}`);
      }
    }
  }
}
