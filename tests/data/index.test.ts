import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Data, DataOperationStatus, DataProviderType } from '@esync/data';
import { Settings } from '@gi-types/gio2';
import * as shell from '@esync/shell';

describe('data/index', () => {
  let mockSettings: Settings;
  let changedCallback: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = new Settings({
      // All 3 providers enabled: 1 | 2 | 4 = 7
      'data-providers': 7,
    });
    mockSettings.connect = vi.fn().mockImplementation((signal, cb) => {
      if (signal === 'changed') {
        changedCallback = cb;
      }
    });
    vi.spyOn(shell, 'getCurrentExtensionSettings').mockReturnValue(mockSettings);
  });

  describe('enums', () => {
    it('defines DataOperationStatus and DataProviderType', () => {
      expect(DataOperationStatus.SUCCESS).toBe(0);
      expect(DataOperationStatus.FAIL).toBe(1);

      expect(DataProviderType.EXTENSIONS).toBe(0);
      expect(DataProviderType.KEYBINDINGS).toBe(1);
      expect(DataProviderType.TWEAKS).toBe(2);
    });
  });

  describe('initialization and provider creation', () => {
    it('initializes all 3 providers when data-providers flag is 7', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const data = new Data();
      const providers = (data as any).providers;
      expect(providers.map((p: any) => p.getName())).toEqual(['extensions', 'keybindings', 'tweaks']);
      expect(logSpy).toHaveBeenCalledWith(
        '[extensions-sync] [data] enabled data providers are EXTENSIONS,KEYBINDINGS,TWEAKS',
      );
    });

    it('initializes only selected providers when flag is subset', () => {
      // 0b100 = 4 (index 2 = tweaks)
      mockSettings.set_flags('data-providers', 4);
      const data = new Data();
      const providers = (data as any).providers;
      expect(providers.map((p: any) => p.getName())).toEqual(['tweaks']);
    });

    it('filters out undefined providers when flag contains unsupported index', () => {
      // 1 | 8 = 9 (index 0 = extensions, index 3 = unsupported)
      mockSettings.set_flags('data-providers', 9);
      const data = new Data();
      const providers = (data as any).providers;
      expect(providers.length).toBe(1);
      expect(providers.map((p: any) => p.getName())).toEqual(['extensions']);
      expect(providers).not.toContain(undefined);
    });

    it('updates providers on changed signal', () => {
      const data = new Data();
      expect((data as any).providers.length).toBe(3);

      mockSettings.set_flags('data-providers', 1); // only extensions
      changedCallback?.();
      expect((data as any).providers.map((p: any) => p.getName())).toEqual(['extensions']);
    });
  });

  describe('getSyncData and use', () => {
    it('returns empty sync structure when no providers are enabled', async () => {
      mockSettings.set_flags('data-providers', 0);
      const data = new Data();
      const syncData = await data.getSyncData();
      expect(syncData).toEqual({
        extensions: {},
        keybindings: {},
        tweaks: {},
      });
    });

    it('gathers sync data from all enabled providers', async () => {
      const data = new Data();
      const mockExtData = { 'ext-1': {} };
      const mockKeyData = { '/key/': 'val' };
      const mockTweakData = { '/tweak/': 'tval' };

      for (const provider of (data as any).providers) {
        if (provider.getName() === 'extensions') {
          vi.spyOn(provider, 'getData').mockResolvedValue(mockExtData);
        } else if (provider.getName() === 'keybindings') {
          vi.spyOn(provider, 'getData').mockResolvedValue(mockKeyData);
        } else if (provider.getName() === 'tweaks') {
          vi.spyOn(provider, 'getData').mockResolvedValue(mockTweakData);
        }
      }

      const syncData = await data.getSyncData();
      expect(syncData).toEqual({
        extensions: mockExtData,
        keybindings: mockKeyData,
        tweaks: mockTweakData,
      });
    });

    it('passes sync data to enabled providers on use', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const data = new Data();
      const spies: Record<string, any> = {};

      for (const provider of (data as any).providers) {
        spies[provider.getName()] = vi.spyOn(provider, 'useData').mockResolvedValue();
      }

      const inputSyncData = {
        extensions: { ext: {} },
        keybindings: { '/kb/': 'val' },
        tweaks: { '/tw/': 'val' },
      };

      await data.use(inputSyncData);

      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [data] updating extensions settings in local machine');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [data] updating keybindings settings in local machine');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [data] updating tweaks settings in local machine');
      expect(spies.extensions).toHaveBeenCalledWith(inputSyncData.extensions);
      expect(spies.keybindings).toHaveBeenCalledWith(inputSyncData.keybindings);
      expect(spies.tweaks).toHaveBeenCalledWith(inputSyncData.tweaks);
    });
  });

  describe('destroy', () => {
    it('disconnects settings changed signal if connected', () => {
      const data = new Data();
      const settings = (data as any).settings;
      settings.disconnect = vi.fn();
      (data as any).settingsChangedId = 77;

      data.destroy();
      expect(settings.disconnect).toHaveBeenCalledWith(77);
      expect((data as any).settingsChangedId).toBeUndefined();

      data.destroy();
      expect(settings.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
