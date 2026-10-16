import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Sync, SyncEvents } from '@esync/sync';
import { SyncEvent } from '@esync/api/types';
import { EventEmitter } from 'events';
import * as shell from '@esync/shell';

describe('sync/index', () => {
  let eventEmitter: EventEmitter;
  let mockData: any;
  let sync: Sync;

  beforeEach(() => {
    vi.clearAllMocks();
    eventEmitter = new EventEmitter();
    mockData = {
      use: vi.fn().mockResolvedValue(undefined),
    };
    sync = new Sync(eventEmitter, mockData);
    vi.spyOn(shell, 'notify').mockImplementation(() => {});
    vi.spyOn(shell, 'restartShell').mockImplementation(() => {});
  });

  describe('SyncEvents', () => {
    it('defines SYNCHRONIZED enum', () => {
      expect(SyncEvents.SYNCHRONIZED).toBe(0);
    });
  });

  describe('lifecycle', () => {
    it('registers and unregisters READ_FINISHED listener on start and stop', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      expect(eventEmitter.listenerCount(SyncEvent.READ_FINISHED)).toBe(0);
      sync.start();
      expect(eventEmitter.listenerCount(SyncEvent.READ_FINISHED)).toBe(1);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [sync] listening for read completion events');

      sync.stop();
      expect(eventEmitter.listenerCount(SyncEvent.READ_FINISHED)).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [sync] stopped listening for read completion events');
    });
  });

  describe('onReadFinished', () => {
    it('does nothing when syncData is undefined', async () => {
      sync.start();
      eventEmitter.emit(SyncEvent.READ_FINISHED, undefined);
      await new Promise((r) => setTimeout(r, 10));

      expect(mockData.use).not.toHaveBeenCalled();
      expect(shell.notify).not.toHaveBeenCalled();
    });

    it('applies sync data and notifies user to reload shell when canRestartShell is false', async () => {
      vi.spyOn(shell, 'canRestartShell').mockReturnValue(false);
      sync.start();

      const syncData = { extensions: {}, keybindings: {}, tweaks: {} };
      eventEmitter.emit(SyncEvent.READ_FINISHED, syncData);
      await new Promise((r) => setTimeout(r, 10));

      expect(mockData.use).toHaveBeenCalledWith(syncData);
      expect(shell.notify).toHaveBeenCalledWith('Extensions are updated. Please reload Gnome Shell');
      expect(shell.restartShell).not.toHaveBeenCalled();
    });

    it('restarts shell when canRestartShell returns true', async () => {
      vi.spyOn(shell, 'canRestartShell').mockReturnValue(true);
      sync.start();

      const syncData = { extensions: {}, keybindings: {}, tweaks: {} };
      eventEmitter.emit(SyncEvent.READ_FINISHED, syncData);
      await new Promise((r) => setTimeout(r, 10));

      expect(mockData.use).toHaveBeenCalledWith(syncData);
      expect(shell.restartShell).toHaveBeenCalledWith('Extensions are updated. Reloading Gnome Shell');
    });

    it('notifies error when data.use rejects', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      vi.spyOn(shell, 'canRestartShell').mockReturnValue(false);
      mockData.use.mockRejectedValue(new Error('Apply failure'));
      sync.start();

      const syncData = { extensions: {}, keybindings: {}, tweaks: {} };
      eventEmitter.emit(SyncEvent.READ_FINISHED, syncData);
      await new Promise((r) => setTimeout(r, 10));

      expect(shell.notify).toHaveBeenCalledWith('Failed to apply sync data to current system.');
      expect(shell.notify).toHaveBeenCalledWith('Extensions are updated. Please reload Gnome Shell');
      expect(logSpy).toHaveBeenCalledWith(
        '[extensions-sync] [sync] failed to apply sync data to system: Error: Apply failure',
      );
    });
  });
});
