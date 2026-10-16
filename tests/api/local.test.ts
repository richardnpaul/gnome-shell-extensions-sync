import { describe, it, expect, beforeEach } from 'vitest';
import { Local } from '@esync/api/providers/local';
import { SyncOperationStatus } from '@esync/api/types';
import { File, FileCreateFlags } from '@gi-types/gio2';

describe('api/providers/local', () => {
  beforeEach(() => {
    File.mockExists = true;
    File.mockLoadStatus = true;
    File.mockContent = new Uint8Array();
    File.lastReplacedContents = null;
    File.lastReplacedFlags = null;
  });

  it('returns provider name Local', () => {
    const provider = new Local('file:///tmp/backup.json');
    expect(provider.getName()).toBe('Local');
  });

  describe('save', () => {
    it('throws error when backupFileLocation is empty string', async () => {
      const provider = new Local('');
      await expect(provider.save({ extensions: {}, keybindings: {}, tweaks: {} })).rejects.toThrow(
        'Please select a backup file location from preferences',
      );
    });

    it('throws error when file does not exist', async () => {
      File.mockExists = false;
      const provider = new Local('file:///tmp/backup.json');
      await expect(provider.save({ extensions: {}, keybindings: {}, tweaks: {} })).rejects.toThrow(
        'Failed to backup settings. file:///tmp/backup.json does not exist',
      );
    });

    it('saves sync data to file and returns SUCCESS', async () => {
      const syncData = { extensions: { 'ext-1': {} }, keybindings: {}, tweaks: {} };
      const provider = new Local('file:///tmp/backup.json');
      const status = await provider.save(syncData);

      expect(status).toBe(SyncOperationStatus.SUCCESS);
      expect(File.lastReplacedFlags).toBe(FileCreateFlags.REPLACE_DESTINATION);
      expect(File.lastMakeBackup).toBe(false);
      expect(File.lastReplacedContents).not.toBeNull();
      const decoded = new TextDecoder().decode(File.lastReplacedContents!);
      expect(JSON.parse(decoded)).toEqual(syncData);
    });
  });

  describe('read', () => {
    it('throws error when file does not exist', async () => {
      File.mockExists = false;
      const provider = new Local('file:///tmp/backup.json');
      await expect(provider.read()).rejects.toThrow(
        'Failed to read settings from backup. file:///tmp/backup.json does not exist',
      );
    });

    it('throws error when file content is empty', async () => {
      File.mockContent = new Uint8Array();
      File.mockLoadStatus = true;
      const provider = new Local('file:///tmp/backup.json');
      await expect(provider.read()).rejects.toThrow(
        'Failed to read settings from backup. file:///tmp/backup.json is corrupted',
      );
    });

    it('throws error when load status is false', async () => {
      File.mockContent = new TextEncoder().encode('{"valid": "json"}');
      File.mockLoadStatus = false;
      const provider = new Local('file:///tmp/backup.json');
      await expect(provider.read()).rejects.toThrow(
        'Failed to read settings from backup. file:///tmp/backup.json could not be read',
      );
    });

    it('throws error when content is not valid JSON', async () => {
      File.mockContent = new TextEncoder().encode('not valid json {');
      File.mockLoadStatus = true;
      const provider = new Local('file:///tmp/backup.json');
      await expect(provider.read()).rejects.toThrow('file:///tmp/backup.json is not a json file');
    });

    it('reads and parses valid json sync data', async () => {
      const expectedData = { extensions: { 'ext-1': {} }, keybindings: {}, tweaks: {} };
      File.mockContent = new TextEncoder().encode(JSON.stringify(expectedData));
      File.mockLoadStatus = true;
      const provider = new Local('file:///tmp/backup.json');
      const data = await provider.read();
      expect(data).toEqual(expectedData);
    });
  });
});
