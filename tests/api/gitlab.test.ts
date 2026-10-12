import { describe, it, expect, beforeEach } from 'vitest';
import { Gitlab } from '@esync/api/providers/gitlab';
import { SyncOperationStatus } from '@esync/api/types';
import { Session, Status } from '@gi-types/soup3';
import { Bytes } from '@gi-types/glib2';

describe('api/providers/gitlab', () => {
  beforeEach(() => {
    Session.mockStatusCode = Status.OK;
    Session.mockResponseBytes = new Bytes(new Uint8Array());
    Session.lastMessage = null;
  });

  it('returns provider name Gitlab', () => {
    const provider = new Gitlab('snip123', 'tok789');
    expect(provider.getName()).toBe('Gitlab');
  });

  describe('save', () => {
    it('sends PUT request with correct headers and payload', async () => {
      const provider = new Gitlab('snip123', 'tok789');
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
      const provider = new Gitlab('snip123', 'tok789');

      await expect(provider.save({ extensions: {}, keybindings: {}, tweaks: {} })).rejects.toThrow(
        'failed to save data to Gitlab. Server status: Not Found',
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

      const provider = new Gitlab('snip123', 'tok789');
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
      const provider = new Gitlab('snip123', 'tok789');

      await expect(provider.read()).rejects.toThrow('failed to read data from Gitlab. Server status: Bad Request');
    });

    it('throws error when response data is null', async () => {
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = {
        get_data: () => null,
      } as any;

      const provider = new Gitlab('snip123', 'tok789');
      await expect(provider.read()).rejects.toThrow('failed to read data from Gitlab. Empty response');
    });
  });
});
