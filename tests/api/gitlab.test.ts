import { describe, it, expect, beforeEach } from 'vitest';
import { Gitlab } from '@esync/api/providers/gitlab';
import { SyncOperationStatus } from '@esync/api/types';
import { CredentialType } from '@esync/core/ports';
import { InMemoryCredentialStore } from '@esync/platform/credentials/inMemoryCredentialStore';
import { Session, Status } from '@gi-types/soup3';
import { Bytes } from '@gi-types/glib2';

describe('api/providers/gitlab', () => {
  let credentialStore: InMemoryCredentialStore;

  beforeEach(async () => {
    Session.mockStatusCode = Status.OK;
    Session.mockResponseBytes = new Bytes(new Uint8Array());
    Session.lastMessage = null;

    credentialStore = new InMemoryCredentialStore();
    await credentialStore.setCredential('gitlab', CredentialType.TOKEN, 'tok789');
    await credentialStore.setCredential('gitlab', CredentialType.REMOTE_ID, 'snip123');
  });

  it('returns provider name Gitlab', () => {
    const provider = new Gitlab(credentialStore);
    expect(provider.getName()).toBe('Gitlab');
  });

  describe('save', () => {
    it('sends PUT request with correct headers and payload', async () => {
      const provider = new Gitlab(credentialStore);
      const syncData = {
        extensions: { ext: {} },
        keybindings: {},
        tweaks: {},
      };

      const result = await provider.save(syncData);
      expect(result).toBe(SyncOperationStatus.SUCCESS);

      const msg = Session.lastMessage!;
      expect(msg.method).toBe('PUT');
      expect(msg.uri).toBe('https://gitlab.com/api/v4/snippets/snip123');
      expect(msg.request_headers.headers['User-Agent']).toBe('Mozilla/5.0');
      expect(msg.request_headers.headers['PRIVATE-TOKEN']).toBe('tok789');
      expect(msg.requestContentType).toBe('application/json');

      const body = JSON.parse(new TextDecoder().decode(msg.requestBodyBytes!.get_data()!));
      expect(body.title).toBe('Extensions Sync');
      expect(JSON.parse(body.content)).toEqual(syncData);
    });

    it('throws error when server status is not OK', async () => {
      Session.mockStatusCode = Status.NOT_FOUND;
      const provider = new Gitlab(credentialStore);

      await expect(provider.save({ extensions: {}, keybindings: {}, tweaks: {} })).rejects.toThrow(
        'failed to save data to Gitlab. Server status: Not Found',
      );
    });

    it('throws error when credentials are fully missing on save', async () => {
      credentialStore.clear();
      const provider = new Gitlab(credentialStore);

      await expect(provider.save({ extensions: {}, keybindings: {}, tweaks: {} })).rejects.toThrow(
        'failed to save data to Gitlab. Missing credentials',
      );
    });

    it('throws error when token is present but remoteId is missing on save', async () => {
      credentialStore.clear();
      await credentialStore.setCredential('gitlab', CredentialType.TOKEN, 'tok789');
      const provider = new Gitlab(credentialStore);

      await expect(provider.save({ extensions: {}, keybindings: {}, tweaks: {} })).rejects.toThrow(
        'failed to save data to Gitlab. Missing credentials',
      );
    });

    it('throws error when remoteId is present but token is missing on save', async () => {
      credentialStore.clear();
      await credentialStore.setCredential('gitlab', CredentialType.REMOTE_ID, 'snip123');
      const provider = new Gitlab(credentialStore);

      await expect(provider.save({ extensions: {}, keybindings: {}, tweaks: {} })).rejects.toThrow(
        'failed to save data to Gitlab. Missing credentials',
      );
    });
  });

  describe('read', () => {
    it('sends GET request to /raw endpoint and parses snippet content', async () => {
      const syncData = {
        extensions: { 'ext-gitlab': {} },
        keybindings: {},
        tweaks: {},
      };
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = new Bytes(new TextEncoder().encode(JSON.stringify(syncData)));

      const provider = new Gitlab(credentialStore);
      const result = await provider.read();

      const msg = Session.lastMessage!;
      expect(msg.method).toBe('GET');
      expect(msg.uri).toBe('https://gitlab.com/api/v4/snippets/snip123/raw');
      expect(msg.request_headers.headers['User-Agent']).toBe('Mozilla/5.0');
      expect(msg.request_headers.headers['PRIVATE-TOKEN']).toBe('tok789');

      expect(result).toEqual(syncData);
    });

    it('throws error when server status is not OK', async () => {
      Session.mockStatusCode = Status.BAD_REQUEST;
      const provider = new Gitlab(credentialStore);

      await expect(provider.read()).rejects.toThrow('failed to read data from Gitlab. Server status: Bad Request');
    });

    it('throws error when response data is null', async () => {
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = {
        get_data: () => null,
      } as any;

      const provider = new Gitlab(credentialStore);
      await expect(provider.read()).rejects.toThrow('failed to read data from Gitlab. Empty response');
    });

    it('throws error when credentials are fully missing on read', async () => {
      credentialStore.clear();
      const provider = new Gitlab(credentialStore);

      await expect(provider.read()).rejects.toThrow('failed to read data from Gitlab. Missing credentials');
    });

    it('throws error when token is present but remoteId is missing on read', async () => {
      credentialStore.clear();
      await credentialStore.setCredential('gitlab', CredentialType.TOKEN, 'tok789');
      const provider = new Gitlab(credentialStore);

      await expect(provider.read()).rejects.toThrow('failed to read data from Gitlab. Missing credentials');
    });

    it('throws error when remoteId is present but token is missing on read', async () => {
      credentialStore.clear();
      await credentialStore.setCredential('gitlab', CredentialType.REMOTE_ID, 'snip123');
      const provider = new Gitlab(credentialStore);

      await expect(provider.read()).rejects.toThrow('failed to read data from Gitlab. Missing credentials');
    });
  });
});
