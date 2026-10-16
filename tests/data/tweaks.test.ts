import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TweaksDataProvider } from '@esync/data/providers/tweaks';
import * as shell from '@esync/shell';

describe('data/providers/tweaks', () => {
  let provider: TweaksDataProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new TweaksDataProvider();
  });

  it('returns name tweaks', () => {
    expect(provider.getName()).toBe('tweaks');
  });

  describe('getData', () => {
    it('reads dconf data for all tweaks schemas', async () => {
      vi.spyOn(shell, 'readDconfData').mockImplementation(async (schema) => `dump for ${schema}`);

      const data = await provider.getData();
      expect(Object.keys(data)).toEqual([
        '/org/gnome/desktop/background/',
        '/org/gnome/desktop/calendar/',
        '/org/gnome/desktop/input-sources/',
        '/org/gnome/desktop/interface/',
        '/org/gnome/desktop/peripherals/',
        '/org/gnome/desktop/screensaver/',
        '/org/gnome/desktop/sound/',
        '/org/gnome/desktop/wm/preferences/',
        '/org/gnome/mutter/',
        '/org/gnome/settings-daemon/plugins/xsettings/',
      ]);
      expect(data['/org/gnome/desktop/background/']).toBe('dump for /org/gnome/desktop/background/');
    });

    it('catches and continues when readDconfData throws for a schema', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      vi.spyOn(shell, 'readDconfData').mockImplementation(async (schema) => {
        if (schema.includes('screensaver')) {
          throw new Error('dconf dump failed');
        }
        return `dump for ${schema}`;
      });

      const data = await provider.getData();
      expect(data['/org/gnome/desktop/screensaver/']).toBeUndefined();
      expect(data['/org/gnome/desktop/background/']).toBe('dump for /org/gnome/desktop/background/');
      expect(logSpy).toHaveBeenCalledWith(
        '[extensions-sync] [tweaks-data-provider] cannot dump settings for /org/gnome/desktop/screensaver/',
      );
    });
  });

  describe('useData', () => {
    it('writes dconf data for all given tweaks schemas', async () => {
      const writeSpy = vi.spyOn(shell, 'writeDconfData').mockResolvedValue();
      const inputData = {
        '/org/gnome/desktop/background/': 'bg-val',
        '/org/gnome/desktop/sound/': 'sound-val',
      };

      await provider.useData(inputData);
      expect(writeSpy).toHaveBeenCalledTimes(2);
      expect(writeSpy).toHaveBeenCalledWith('/org/gnome/desktop/background/', 'bg-val');
      expect(writeSpy).toHaveBeenCalledWith('/org/gnome/desktop/sound/', 'sound-val');
    });
  });
});
