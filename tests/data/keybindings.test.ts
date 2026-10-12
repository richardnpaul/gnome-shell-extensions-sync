import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyBindingsDataProvider } from '@esync/data/providers/keybindings';
import * as shell from '@esync/shell';

describe('data/providers/keybindings', () => {
  let provider: KeyBindingsDataProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new KeyBindingsDataProvider();
  });

  it('returns name keybindings', () => {
    expect(provider.getName()).toBe('keybindings');
  });

  describe('getData', () => {
    it('reads dconf data for all keybindings schemas', async () => {
      vi.spyOn(shell, 'readDconfData').mockImplementation(async (schema) => `dump for ${schema}`);

      const data = await provider.getData();
      expect(Object.keys(data)).toEqual([
        '/org/gnome/mutter/keybindings/',
        '/org/gnome/mutter/wayland/keybindings/',
        '/org/gnome/shell/keybindings/',
        '/org/gnome/desktop/wm/keybindings/',
        '/org/gnome/settings-daemon/plugins/media-keys/',
      ]);
      expect(data['/org/gnome/mutter/keybindings/']).toBe('dump for /org/gnome/mutter/keybindings/');
    });

    it('catches and continues when readDconfData throws for a schema', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      vi.spyOn(shell, 'readDconfData').mockImplementation(async (schema) => {
        if (schema.includes('wayland')) {
          throw new Error('dconf dump failed');
        }
        return `dump for ${schema}`;
      });

      const data = await provider.getData();
      expect(data['/org/gnome/mutter/wayland/keybindings/']).toBeUndefined();
      expect(data['/org/gnome/mutter/keybindings/']).toBe('dump for /org/gnome/mutter/keybindings/');
      expect(data['/org/gnome/shell/keybindings/']).toBe('dump for /org/gnome/shell/keybindings/');
      expect(logSpy).toHaveBeenCalledWith(
        '[extensions-sync] [keybindings-data-provider] cannot dump settings for /org/gnome/mutter/wayland/keybindings/',
      );
    });
  });

  describe('useData', () => {
    it('writes dconf data for all given schemas', async () => {
      const writeSpy = vi.spyOn(shell, 'writeDconfData').mockResolvedValue();
      const inputData = {
        '/schema/1/': 'val1',
        '/schema/2/': 'val2',
      };

      await provider.useData(inputData);
      expect(writeSpy).toHaveBeenCalledTimes(2);
      expect(writeSpy).toHaveBeenCalledWith('/schema/1/', 'val1');
      expect(writeSpy).toHaveBeenCalledWith('/schema/2/', 'val2');
    });
  });
});
