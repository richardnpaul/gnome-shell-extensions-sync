import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatusMenu } from '@esync/panel/statusMenu';
import { SyncEvent } from '@esync/api/types';
import { EventEmitter } from 'events';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as shell from '@esync/shell';
import * as utils from '@esync/utils';
import { Settings } from '@gi-types/gio2';

describe('panel/statusMenu', () => {
  let eventEmitter: EventEmitter;
  let mockSettings: Settings;
  let trayIconChangedCallback: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    eventEmitter = new EventEmitter();
    mockSettings = new Settings({
      'show-tray-icon': true,
    });
    mockSettings.connect = vi.fn().mockImplementation((signal, cb) => {
      if (signal === 'changed::show-tray-icon') {
        trayIconChangedCallback = cb;
      }
    });

    shell.setCurrentExtension({
      path: '/ext/path',
      metadata: { uuid: 'extensions-sync@richardnpaul.github.com' },
    });
    vi.spyOn(shell, 'getCurrentExtensionSettings').mockReturnValue(mockSettings);
  });

  describe('show and hide', () => {
    it('creates button, attaches event listeners, and adds to panel when show is called', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const menu = new StatusMenu(eventEmitter);
      const getSettingsSpy = vi.spyOn(shell, 'getCurrentExtensionSettings');
      menu.show();

      expect(getSettingsSpy).not.toHaveBeenCalled();
      expect(Main.panel.addToStatusArea).toHaveBeenCalledWith('extensions-sync', expect.anything());
      const button = (menu as any).button;
      expect(button).toBeDefined();
      expect(button.nameText).toBe('Sync Settings');
      expect(button.menuAlignment).toBe(0.0);
      expect(button.dontCreateMenu).toBe(false);
      expect(button.icon.style_class).toBe('system-status-icon');
      expect(button.icon.gicon.name).toBe('/ext/path/icons/extensions-sync-synced-symbolic.svg');
      expect(button.children).toContain(button.icon);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [statusMenu] showing status menu in panel');

      // Calling show again reuses existing button
      menu.show();
      expect((menu as any).button).toBe(button);
    });

    it('does nothing in show() if show-tray-icon is false', () => {
      mockSettings.set_boolean('show-tray-icon', false);
      const menu = new StatusMenu(eventEmitter);
      menu.show();

      expect(Main.panel.addToStatusArea).not.toHaveBeenCalled();
      expect((menu as any).button).toBeUndefined();
    });

    it('fetches settings in show() if settings was null at construction and respects false flag', () => {
      vi.spyOn(shell, 'getCurrentExtensionSettings').mockReturnValueOnce(null as any);
      const menu = new StatusMenu(eventEmitter);
      expect((menu as any).settings).toBeNull();

      const falseSettings = new Settings({ 'show-tray-icon': false });
      vi.spyOn(shell, 'getCurrentExtensionSettings').mockReturnValue(falseSettings);
      menu.show();

      expect((menu as any).settings).toBe(falseSettings);
      expect(Main.panel.addToStatusArea).not.toHaveBeenCalled();
      expect((menu as any).button).toBeUndefined();
    });

    it('defaults showTrayIcon to true when settings remains null in show()', () => {
      vi.spyOn(shell, 'getCurrentExtensionSettings').mockReturnValue(null as any);
      const menu = new StatusMenu(eventEmitter);
      menu.show();
      expect(Main.panel.addToStatusArea).toHaveBeenCalled();
    });

    it('destroys button and unbinds listeners on hide', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const menu = new StatusMenu(eventEmitter);
      menu.show();
      const button = (menu as any).button;

      expect(eventEmitter.listenerCount(SyncEvent.SAVE)).toBe(1);
      expect(eventEmitter.listenerCount(SyncEvent.READ)).toBe(1);
      expect(eventEmitter.listenerCount(SyncEvent.SAVE_FINISHED)).toBe(1);
      expect(eventEmitter.listenerCount(SyncEvent.READ_FINISHED)).toBe(1);

      menu.hide();
      expect(button.destroyed).toBe(true);
      expect((menu as any).button).toBeUndefined();
      expect(eventEmitter.listenerCount(SyncEvent.SAVE)).toBe(0);
      expect(eventEmitter.listenerCount(SyncEvent.READ)).toBe(0);
      expect(eventEmitter.listenerCount(SyncEvent.SAVE_FINISHED)).toBe(0);
      expect(eventEmitter.listenerCount(SyncEvent.READ_FINISHED)).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [statusMenu] removing status menu from panel');

      // Calling hide again when already hidden does not throw
      expect(() => menu.hide()).not.toThrow();
    });

    it('toggles menu visibility when show-tray-icon changes', () => {
      const menu = new StatusMenu(eventEmitter);
      menu.show();
      expect((menu as any).button).toBeDefined();

      // Toggle off
      mockSettings.set_boolean('show-tray-icon', false);
      trayIconChangedCallback?.();
      expect((menu as any).button).toBeUndefined();

      // Toggle on
      mockSettings.set_boolean('show-tray-icon', true);
      trayIconChangedCallback?.();
      expect((menu as any).button).toBeDefined();

      // Toggle when settings is null defaults to true
      (menu as any).settings = null;
      (menu as any).toggleStatusMenu();
      expect((menu as any).button).toBeDefined();
    });
  });

  describe('menu items interaction', () => {
    it('handles menu items: upload, download, and preferences', () => {
      const openPreferencesMock = vi.fn();
      shell.setCurrentExtension({
        path: '/ext/path',
        metadata: { uuid: 'extensions-sync@richardnpaul.github.com' },
        openPreferences: openPreferencesMock,
      });

      const menu = new StatusMenu(eventEmitter);
      menu.show();
      const button = (menu as any).button;
      const addMenuItemCalls = button.menu.addMenuItem.mock.calls;

      // item 0: Upload
      const uploadItem = addMenuItemCalls[0][0];
      expect(uploadItem.title).toBe('Upload');
      expect(uploadItem.icon.name).toBe('/ext/path/icons/extensions-sync-upload-symbolic.svg');
      const saveSpy = vi.fn();
      eventEmitter.on(SyncEvent.SAVE, saveSpy);
      uploadItem.callbacks.activate();
      expect(saveSpy).toHaveBeenCalled();

      // item 1: Download
      const downloadItem = addMenuItemCalls[1][0];
      expect(downloadItem.title).toBe('Download');
      expect(downloadItem.icon.name).toBe('/ext/path/icons/extensions-sync-download-symbolic.svg');
      const readSpy = vi.fn();
      eventEmitter.on(SyncEvent.READ, readSpy);
      downloadItem.callbacks.activate();
      expect(readSpy).toHaveBeenCalled();

      // item 3: Preferences with openPreferences
      const prefsItem = addMenuItemCalls[3][0];
      expect(prefsItem.title).toBe('Preferences');
      expect(prefsItem.icon.name).toBe('/ext/path/icons/extensions-sync-preferences-symbolic.svg');
      prefsItem.callbacks.activate();
      expect(openPreferencesMock).toHaveBeenCalled();
    });

    it('executes gnome-extensions prefs command when openPreferences is not available', () => {
      shell.setCurrentExtension({
        path: '/ext/path',
        metadata: { uuid: 'extensions-sync@richardnpaul.github.com' },
      });
      const execSpy = vi.spyOn(utils, 'execute').mockResolvedValue('');

      const menu = new StatusMenu(eventEmitter);
      menu.show();
      const button = (menu as any).button;
      const prefsItem = button.menu.addMenuItem.mock.calls[3][0];

      prefsItem.callbacks.activate();
      expect(execSpy).toHaveBeenCalledWith('gnome-extensions prefs "extensions-sync@richardnpaul.github.com"');
    });

    it('falls back to default uuid when extension metadata is null in preferences handler', () => {
      shell.setCurrentExtension({ path: '/ext/path', metadata: null as any });
      const execSpy = vi.spyOn(utils, 'execute').mockResolvedValue('');

      const menu = new StatusMenu(eventEmitter);
      menu.show();
      const button = (menu as any).button;
      const prefsItem = button.menu.addMenuItem.mock.calls[3][0];

      prefsItem.callbacks.activate();
      expect(execSpy).toHaveBeenCalledWith('gnome-extensions prefs "extensions-sync@richardnpaul.github.com"');
    });

    it('falls back to default uuid when this.extension is null in preferences handler', () => {
      shell.setCurrentExtension(null);
      const execSpy = vi.spyOn(utils, 'execute').mockResolvedValue('');

      const menu = new StatusMenu(eventEmitter);
      (menu as any).extension = null;
      menu.show();
      const button = (menu as any).button;
      const prefsItem = button.menu.addMenuItem.mock.calls[3][0];

      prefsItem.callbacks.activate();
      expect(execSpy).toHaveBeenCalledWith('gnome-extensions prefs "extensions-sync@richardnpaul.github.com"');
    });

    it('falls back to empty base path when extension is null', () => {
      shell.setCurrentExtension(null);
      const menu = new StatusMenu(eventEmitter);
      menu.show();
      const button = (menu as any).button;
      expect(button.icon.gicon.name).toBe('/icons/extensions-sync-synced-symbolic.svg');
    });

    it('uses this.extension when getCurrentExtension is null', () => {
      const menu = new StatusMenu(eventEmitter);
      shell.setCurrentExtension(null);
      (menu as any).extension = { path: '/saved/path' };
      const icon = (menu as any).createIcon('upload');
      expect(icon.gicon.name).toBe('/saved/path/icons/extensions-sync-upload-symbolic.svg');
      expect(icon.style_class).toBe('system-status-icon');
    });
  });

  describe('button state enable and disable', () => {
    it('disables button and closes menu when SAVE or READ is emitted', () => {
      const menu = new StatusMenu(eventEmitter);
      menu.show();
      const button = (menu as any).button;

      eventEmitter.emit(SyncEvent.SAVE);
      expect(button.reactive).toBe(false);
      expect(button.icon.gicon.name).toBe('/ext/path/icons/extensions-sync-syncing-symbolic.svg');
      expect(button.menu.close).toHaveBeenCalled();

      button.reactive = true;
      eventEmitter.emit(SyncEvent.READ);
      expect(button.reactive).toBe(false);
      expect(button.icon.gicon.name).toBe('/ext/path/icons/extensions-sync-syncing-symbolic.svg');
    });

    it('enables button when SAVE_FINISHED or READ_FINISHED is emitted', () => {
      const menu = new StatusMenu(eventEmitter);
      menu.show();
      const button = (menu as any).button;
      button.reactive = false;

      eventEmitter.emit(SyncEvent.SAVE_FINISHED);
      expect(button.reactive).toBe(true);
      expect(button.icon.gicon.name).toBe('/ext/path/icons/extensions-sync-synced-symbolic.svg');

      button.reactive = false;
      eventEmitter.emit(SyncEvent.READ_FINISHED);
      expect(button.reactive).toBe(true);
      expect(button.icon.gicon.name).toBe('/ext/path/icons/extensions-sync-synced-symbolic.svg');
    });

    it('enableButton and disableButton do nothing if button is undefined', () => {
      const menu = new StatusMenu(eventEmitter);
      expect(() => {
        (menu as any).enableButton();
        (menu as any).disableButton();
      }).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('hides menu and disconnects tray icon signal', () => {
      const menu = new StatusMenu(eventEmitter);
      menu.show();
      expect((menu as any).button).toBeDefined();

      const disconnectSpy = vi.fn();
      mockSettings.disconnect = disconnectSpy;
      (menu as any).traySignalId = 88;

      menu.destroy();
      expect((menu as any).button).toBeUndefined();
      expect(disconnectSpy).toHaveBeenCalledWith(88);
      expect((menu as any).traySignalId).toBeUndefined();

      menu.destroy();
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });
});
