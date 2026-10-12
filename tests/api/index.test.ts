import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Api } from '@esync/api';
import { SyncEvent, SyncOperationStatus, SyncProviderType } from '@esync/api/types';
import { EventEmitter } from 'events';
import { Settings } from '@gi-types/gio2';
import * as shell from '@esync/shell';

describe('api/index', () => {
  let eventEmitter: EventEmitter;
  let mockData: any;
  let mockSettings: Settings;
  let changedCallback: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    eventEmitter = new EventEmitter();
    mockData = {
      getSyncData: vi.fn().mockResolvedValue({
        extensions: {},
        keybindings: {},
        tweaks: {},
      }),
    };
    mockSettings = new Settings({
      provider: SyncProviderType.GITHUB,
      'github-gist-id': 'gist123',
      'github-user-token': 'token123',
      'gitlab-snippet-id': 'snip123',
      'gitlab-user-token': 'gltoken123',
      'backup-file-location': 'file:///backup.json',
    });
    mockSettings.connect = vi.fn().mockImplementation((signal, cb) => {
      if (signal === 'changed') {
        changedCallback = cb;
      }
    });
    vi.spyOn(shell, 'getCurrentExtensionSettings').mockReturnValue(mockSettings);
    vi.spyOn(shell, 'notify').mockImplementation(() => {});
  });

  describe('provider initialization and switching', () => {
    it('creates GitHub provider by default or when GITHUB is selected', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const api = new Api(eventEmitter, mockData);
      expect((api as any).provider.getName()).toBe('Github');
      expect((api as any).provider.gistId).toBe('gist123');
      expect((api as any).provider.userToken).toBe('token123');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [api] changing provider to GITHUB');
    });

    it('creates GitLab provider when GITLAB is selected', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      mockSettings.set_enum('provider', SyncProviderType.GITLAB);
      const api = new Api(eventEmitter, mockData);
      expect((api as any).provider.getName()).toBe('Gitlab');
      expect((api as any).provider.snippetId).toBe('snip123');
      expect((api as any).provider.userToken).toBe('gltoken123');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [api] changing provider to GITLAB');
    });

    it('creates Local provider when LOCAL is selected', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      mockSettings.set_enum('provider', SyncProviderType.LOCAL);
      const api = new Api(eventEmitter, mockData);
      expect((api as any).provider.getName()).toBe('Local');
      expect((api as any).provider.backupFileLocation).toBe('file:///backup.json');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [api] changing provider to LOCAL');
    });

    it('falls back to GitHub provider when unknown provider is selected', () => {
      mockSettings.set_enum('provider', 999 as any);
      const api = new Api(eventEmitter, mockData);
      expect((api as any).provider.getName()).toBe('Github');
    });

    it('updates provider when settings changed signal is emitted', () => {
      const api = new Api(eventEmitter, mockData);
      expect((api as any).provider.getName()).toBe('Github');

      mockSettings.set_enum('provider', SyncProviderType.LOCAL);
      changedCallback?.();
      expect((api as any).provider.getName()).toBe('Local');
    });
  });

  describe('save', () => {
    it('saves data successfully and emits SAVE_FINISHED with success status', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const api = new Api(eventEmitter, mockData);
      const saveSpy = vi.fn().mockResolvedValue(SyncOperationStatus.SUCCESS);
      (api as any).provider.save = saveSpy;

      const saveFinishedSpy = vi.fn();
      eventEmitter.on(SyncEvent.SAVE_FINISHED, saveFinishedSpy);

      await api.save();

      expect(mockData.getSyncData).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalledWith({
        extensions: {},
        keybindings: {},
        tweaks: {},
      });
      expect(saveFinishedSpy).toHaveBeenCalledWith(SyncOperationStatus.SUCCESS);
      expect(shell.notify).toHaveBeenCalledWith('Settings successfully saved to Github');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [api] got save request, saving settings...');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [api] saved settings to Github successfully');
    });

    it('responds to eventEmitter SAVE event', async () => {
      const api = new Api(eventEmitter, mockData);
      const saveSpy = vi.fn().mockResolvedValue(SyncOperationStatus.SUCCESS);
      (api as any).provider.save = saveSpy;

      eventEmitter.emit(SyncEvent.SAVE);
      // Wait a tick for async handler
      await new Promise((r) => setTimeout(r, 10));

      expect(saveSpy).toHaveBeenCalled();
    });

    it('throws and emits SAVE_FINISHED with error when status is FAIL', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const api = new Api(eventEmitter, mockData);
      (api as any).provider.save = vi.fn().mockResolvedValue(SyncOperationStatus.FAIL);

      const saveFinishedSpy = vi.fn();
      eventEmitter.on(SyncEvent.SAVE_FINISHED, saveFinishedSpy);

      await api.save();

      expect(saveFinishedSpy).toHaveBeenCalledWith(undefined, expect.objectContaining({ message: 'Could not save' }));
      expect(shell.notify).toHaveBeenCalledWith(
        'Error occured while saving settings to Github. Please check the logs.',
      );
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [api] got save request, saving settings...');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[extensions-sync] [api] error occured during save. -> Error: Could not save'),
      );
    });

    it('emits SAVE_FINISHED with error when provider.save rejects', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const api = new Api(eventEmitter, mockData);
      (api as any).provider.save = vi.fn().mockRejectedValue(new Error('Network error'));

      const saveFinishedSpy = vi.fn();
      eventEmitter.on(SyncEvent.SAVE_FINISHED, saveFinishedSpy);

      await api.save();

      expect(saveFinishedSpy).toHaveBeenCalledWith(undefined, expect.any(Error));
      expect(shell.notify).toHaveBeenCalledWith(
        'Error occured while saving settings to Github. Please check the logs.',
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[extensions-sync] [api] error occured during save. -> Error: Network error'),
      );
    });
  });

  describe('read', () => {
    it('reads data successfully and emits READ_FINISHED with data', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const api = new Api(eventEmitter, mockData);
      const readData = { extensions: { ext1: {} }, keybindings: {}, tweaks: {} };
      (api as any).provider.read = vi.fn().mockResolvedValue(readData);

      const readFinishedSpy = vi.fn();
      eventEmitter.on(SyncEvent.READ_FINISHED, readFinishedSpy);

      await api.read();

      expect(readFinishedSpy).toHaveBeenCalledWith(readData);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [api] got read request, reading settings...');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [api] read settings from Github successfully');
    });

    it('responds to eventEmitter READ event', async () => {
      const api = new Api(eventEmitter, mockData);
      const readSpy = vi.fn().mockResolvedValue({ extensions: {}, keybindings: {}, tweaks: {} });
      (api as any).provider.read = readSpy;

      eventEmitter.emit(SyncEvent.READ);
      await new Promise((r) => setTimeout(r, 10));

      expect(readSpy).toHaveBeenCalled();
    });

    it('emits READ_FINISHED with error when provider.read throws', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const api = new Api(eventEmitter, mockData);
      (api as any).provider.read = vi.fn().mockRejectedValue(new Error('Read error'));

      const readFinishedSpy = vi.fn();
      eventEmitter.on(SyncEvent.READ_FINISHED, readFinishedSpy);

      await api.read();

      expect(readFinishedSpy).toHaveBeenCalledWith(undefined, expect.any(Error));
      expect(shell.notify).toHaveBeenCalledWith(
        'Error occured while reading settings from Github. Please check the logs.',
      );
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [api] got read request, reading settings...');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[extensions-sync] [api] error occured during read. -> Error: Read error'),
      );
    });
  });

  describe('destroy', () => {
    it('disconnects settings changed signal if connected', () => {
      const api = new Api(eventEmitter, mockData);
      const settings = (api as any).settings;
      settings.disconnect = vi.fn();
      (api as any).settingsChangedId = 42;

      api.destroy();
      expect(settings.disconnect).toHaveBeenCalledWith(42);
      expect((api as any).settingsChangedId).toBeUndefined();

      api.destroy();
      expect(settings.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
