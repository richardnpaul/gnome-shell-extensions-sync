import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExtensionType,
  ExtensionState,
  setCurrentExtension,
  getCurrentExtension,
  getCurrentExtensionSettings,
  canRestartShell,
  restartShell,
  notify,
  writeDconfData,
  readDconfData,
  loadInterfaceXML,
  DBUS_INTERFACE_EXTENSIONS_SYNC,
  _,
} from '@esync/shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Settings, File, file_new_tmp, FileCreateFlags } from '@gi-types/gio2';
import { PRIORITY_DEFAULT } from '@gi-types/glib2';
import * as utils from '@esync/utils';

describe('shell/index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentExtension(null);
  });

  describe('enums', () => {
    it('defines ExtensionType and ExtensionState correctly', () => {
      expect(ExtensionType.SYSTEM).toBe(1);
      expect(ExtensionType.PER_USER).toBe(2);

      expect(ExtensionState.ENABLED).toBe(1);
      expect(ExtensionState.DISABLED).toBe(2);
      expect(ExtensionState.ERROR).toBe(3);
      expect(ExtensionState.OUT_OF_DATE).toBe(4);
      expect(ExtensionState.DOWNLOADING).toBe(5);
      expect(ExtensionState.INITIALIZED).toBe(6);
      expect(ExtensionState.UNINSTALLED).toBe(99);
    });
  });

  describe('currentExtension and settings', () => {
    it('sets and gets current extension', () => {
      const mockExt = { uuid: 'test-uuid' };
      setCurrentExtension(mockExt);
      expect(getCurrentExtension()).toBe(mockExt);
    });

    it('returns null if current extension is not set or has no getSettings', () => {
      expect(getCurrentExtensionSettings()).toBeNull();
      setCurrentExtension({});
      expect(getCurrentExtensionSettings()).toBeNull();
      setCurrentExtension({ getSettings: 'not-a-fn' });
      expect(getCurrentExtensionSettings()).toBeNull();
    });

    it('returns settings from current extension getSettings', () => {
      const mockSettings = new Settings();
      setCurrentExtension({ getSettings: () => mockSettings });
      expect(getCurrentExtensionSettings()).toBe(mockSettings);
    });
  });

  describe('shell restart', () => {
    it('canRestartShell always returns false', () => {
      expect(canRestartShell()).toBe(false);
    });

    it('restartShell executes and logs debug message', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      restartShell('reloading');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [shell] restartShell called: reloading');
    });
  });

  describe('notify', () => {
    it('calls Main.notify when show-notifications setting is true', () => {
      const settings = new Settings({ 'show-notifications': true });
      setCurrentExtension({ getSettings: () => settings });
      notify('Test Notification');
      expect(Main.notify).toHaveBeenCalledWith('Test Notification');
    });

    it('calls Main.notify when settings are not present (default true)', () => {
      notify('Default Notification');
      expect(Main.notify).toHaveBeenCalledWith('Default Notification');
    });

    it('does not call Main.notify when show-notifications is false and logs debug', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const settings = new Settings({ 'show-notifications': false });
      setCurrentExtension({ getSettings: () => settings });
      notify('Hidden Notification');
      expect(Main.notify).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        '[extensions-sync] [shell] Notifications are hidden. Logging the content instead. Content: Hidden Notification',
      );
    });
  });

  describe('dconf operations', () => {
    it('writeDconfData does nothing if schemaPath or data is empty', async () => {
      const execSpy = vi.spyOn(utils, 'execute');
      await writeDconfData('', 'some-data');
      await writeDconfData('/org/test/', '');
      expect(execSpy).not.toHaveBeenCalled();
    });

    it('writeDconfData writes temp file and calls dconf load', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const execSpy = vi.spyOn(utils, 'execute').mockResolvedValue('');
      const deleteSpy = vi.spyOn(File.prototype, 'delete');

      await writeDconfData('/org/gnome/test/', 'key=value');

      expect(execSpy).toHaveBeenCalledWith('dconf load /org/gnome/test/ < /tmp/dconf-test');
      expect(File.lastMakeBackup).toBe(false);
      expect(File.lastReplacedFlags).toBe(FileCreateFlags.REPLACE_DESTINATION);
      expect(deleteSpy).toHaveBeenCalledWith(null);
      expect(file_new_tmp.mock.results[0].value[1].close_async).toHaveBeenCalledWith(PRIORITY_DEFAULT, null);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [shell] loaded settings for /org/gnome/test/');
    });

    it('writeDconfData catches error if execute throws', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      vi.spyOn(utils, 'execute').mockRejectedValue(new Error('dconf failed'));

      await expect(writeDconfData('/org/gnome/test/', 'key=value')).resolves.toBeUndefined();
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [shell] cannot load settings for /org/gnome/test/');
    });

    it('readDconfData calls execute with dconf dump', async () => {
      const execSpy = vi.spyOn(utils, 'execute').mockResolvedValue('dumped content');
      const result = await readDconfData('/org/gnome/test/');
      expect(execSpy).toHaveBeenCalledWith('dconf dump /org/gnome/test/');
      expect(result).toBe('dumped content');
    });
  });

  describe('loadInterfaceXML', () => {
    it('returns DBUS_INTERFACE_EXTENSIONS_SYNC for com.github.richardnpaul.ExtensionsSync', () => {
      const result = loadInterfaceXML('com.github.richardnpaul.ExtensionsSync');
      expect(result).toBe(DBUS_INTERFACE_EXTENSIONS_SYNC);
      expect(result).toContain('<interface name="com.github.richardnpaul.ExtensionsSync">');
    });

    it('returns null for other interface names', () => {
      expect(loadInterfaceXML('test')).toBeNull();
      expect(loadInterfaceXML('com.github.richardnpaul.test')).toBeNull();
      expect(loadInterfaceXML('bad-iface')).toBeNull();
    });
  });

  describe('_', () => {
    it('translates strings using gettext', () => {
      expect(_('Settings')).toBe('Settings');
    });
  });
});
