import { describe, it, expect, beforeEach } from 'vitest';
import { Github } from '@esync/api/providers/github';
import { SyncOperationStatus } from '@esync/api/types';
import { Session, Status } from '@gi-types/soup3';
import { Bytes } from '@gi-types/glib2';

describe('api/providers/github', () => {
  beforeEach(() => {
    Session.mockStatusCode = Status.OK;
    Session.mockResponseBytes = new Bytes(new Uint8Array());
    Session.lastMessage = null;
  });

  it('returns provider name Github', () => {
    const provider = new Github('gist123', 'tok456');
    expect(provider.getName()).toBe('Github');
  });

  describe('save', () => {
    it('sends PATCH request with headers and body formatted correctly', async () => {
      const provider = new Github('gist123', 'tok456');
      const syncData = {
        extensions: { 'ext@test.com': { settings: 'val' } },
        keybindings: {},
        tweaks: {},
      };

      const result = await provider.save(syncData);
      expect(result).toBe(SyncOperationStatus.SUCCESS);

      const msg = Session.lastMessage!;
      expect(msg.method).toBe('PATCH');
      expect(msg.uri).toBe('https://api.github.com/gists/gist123');
      expect(msg.request_headers.headers['User-Agent']).toBe('Mozilla/5.0');
      expect(msg.request_headers.headers['Authorization']).toBe('token tok456');
      expect(msg.requestContentType).toBe('application/json');

      const body = JSON.parse(new TextDecoder().decode(msg.requestBodyBytes!.get_data()!));
      expect(body.description).toBe('Extensions Sync');
      expect(JSON.parse(body.files.extensions.content)).toEqual({ 'ext@test.com': { settings: 'val' } });
      expect(JSON.parse(body.files.keybindings.content)).toEqual({});
      expect(JSON.parse(body.files.tweaks.content)).toEqual({});
    });

    it('throws error when server status is not OK', async () => {
      Session.mockStatusCode = Status.NOT_FOUND;
      const provider = new Github('gist123', 'tok456');

      await expect(provider.save({ extensions: {}, keybindings: {}, tweaks: {} })).rejects.toThrow(
        'failed to save data to Github. Server status: Not Found',
      );
    });
  });

  describe('read', () => {
    it('sends GET request and parses response files', async () => {
      const gistResponse = {
        files: {
          extensions: { content: JSON.stringify({ 'ext-1': {} }) },
          keybindings: { content: JSON.stringify({ '/path/': 'val' }) },
          tweaks: { content: JSON.stringify({ '/tweak/': 'tval' }) },
        },
      };
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = new Bytes(new TextEncoder().encode(JSON.stringify(gistResponse)));

      const provider = new Github('gist123', 'tok456');
      const result = await provider.read();

      const msg = Session.lastMessage!;
      expect(msg.method).toBe('GET');
      expect(msg.uri).toBe('https://api.github.com/gists/gist123');
      expect(msg.request_headers.headers['User-Agent']).toBe('Mozilla/5.0');
      expect(msg.request_headers.headers['Authorization']).toBe('token tok456');

      expect(result).toEqual({
        extensions: { 'ext-1': {} },
        keybindings: { '/path/': 'val' },
        tweaks: { '/tweak/': 'tval' },
      });
    });

    it('throws error when status code is not OK', async () => {
      Session.mockStatusCode = Status.BAD_REQUEST;
      const provider = new Github('gist123', 'tok456');

      await expect(provider.read()).rejects.toThrow('failed to read data from Github. Server status: Bad Request');
    });

    it('throws error when response data is null', async () => {
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = {
        get_data: () => null,
      } as any;

      const provider = new Github('gist123', 'tok456');
      await expect(provider.read()).rejects.toThrow('failed to read data from Github. Empty response');
    });

    it('skips files that cannot be parsed as JSON', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const gistResponse = {
        files: {
          extensions: { content: 'invalid json {' },
          keybindings: { content: JSON.stringify({ key: 'val' }) },
        },
      };
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = new Bytes(new TextEncoder().encode(JSON.stringify(gistResponse)));

      const provider = new Github('gist123', 'tok456');
      const result = await provider.read();

      expect(result).toEqual({
        extensions: {},
        keybindings: { key: 'val' },
        tweaks: {},
      });
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [github] failed to parse extensions file. skipping it...');
    });
  });
});
