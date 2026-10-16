/* eslint-disable @typescript-eslint/no-explicit-any */
import Secret from 'gi://Secret';
import { CredentialStorePort, CredentialType, ProviderCredentials } from '@esync/core/ports';

const DEFAULT_SCHEMA = new Secret.Schema(
  'org.gnome.shell.extensions.extensions-sync.Credentials',
  Secret.SchemaFlags.NONE,
  {
    provider: Secret.SchemaAttributeType.STRING,
    type: Secret.SchemaAttributeType.STRING,
  },
);

export class SecretCredentialStore implements CredentialStorePort {
  private schema: any;

  constructor(schema: any = DEFAULT_SCHEMA) {
    this.schema = schema;
  }

  async getCredential(provider: string, type: CredentialType): Promise<string | null> {
    return new Promise((resolve, reject) => {
      Secret.password_lookup(this.schema, { provider, type }, null, (_source: any, result: any) => {
        try {
          const password = Secret.password_lookup_finish(result);
          resolve(password);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async setCredential(provider: string, type: CredentialType, secret: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const label = `Extensions Sync: ${provider} (${type})`;
      Secret.password_store(
        this.schema,
        { provider, type },
        Secret.COLLECTION_DEFAULT,
        label,
        secret,
        null,
        (_source: any, result: any) => {
          try {
            Secret.password_store_finish(result);
            resolve();
          } catch (error) {
            reject(error);
          }
        },
      );
    });
  }

  async deleteCredential(provider: string, type: CredentialType): Promise<void> {
    return new Promise((resolve, reject) => {
      Secret.password_clear(this.schema, { provider, type }, null, (_source: any, result: any) => {
        try {
          Secret.password_clear_finish(result);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async getProviderCredentials(provider: string): Promise<ProviderCredentials> {
    const [token, remoteId] = await Promise.all([
      this.getCredential(provider, CredentialType.TOKEN),
      this.getCredential(provider, CredentialType.REMOTE_ID),
    ]);

    return {
      token: token ?? undefined,
      remoteId: remoteId ?? undefined,
    };
  }
}
