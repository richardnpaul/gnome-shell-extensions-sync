import { describe, it, expect, beforeEach, vi } from 'vitest';
import SyncExtension from '@esync/extension';
import { SyncEvent } from '@esync/api/types';
import * as shell from '@esync/shell';
import { Settings, DBus, DBusExportedObject } from '@gi-types/gio2';
import { Sync } from '@esync/sync';
import { StatusMenu } from '@esync/panel/statusMenu';
import { Api } from '@esync/api';
import { Data } from '@esync/data';

describe('extension', () => {
  let mockSettings: Settings;

  beforeEach(() => {
    vi.clearAllMocks();
    DBusExportedObject.lastExported = null;
    mockSettings = new Settings({
      provider: 0,
      'show-tray-icon': true,
      'data-providers': 7,
    });
    vi.spyOn(shell, 'getCurrentExtensionSettings').mockReturnValue(mockSettings);
  });

  it('initializes extension and sets current extension', () => {
    const logSpy = vi.spyOn(globalThis as any, 'log');
    const ext = new SyncExtension({ uuid: 'my-ext@elhan.io' });
    expect(shell.getCurrentExtension()).toBe(ext);
    expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [extension] extension is initialized');
  });

  it('save and read do nothing before enable is called', () => {
    const ext = new SyncExtension({ uuid: 'my-ext@elhan.io' });
    expect(() => ext.save()).not.toThrow();
    expect(() => ext.read()).not.toThrow();
  });

  describe('enable and disable lifecycle', () => {
    it('enables all subsystems and exports dbus interface if xml is loaded', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const loadXmlSpy = vi.spyOn(shell, 'loadInterfaceXML').mockReturnValue('<node>interface</node>');
      const wrapSpy = vi.spyOn(DBusExportedObject, 'wrapJSObject');
      const setCurrentExtensionSpy = vi.spyOn(shell, 'setCurrentExtension');
      const syncStartSpy = vi.spyOn(Sync.prototype, 'start');
      const syncStopSpy = vi.spyOn(Sync.prototype, 'stop');
      const menuShowSpy = vi.spyOn(StatusMenu.prototype, 'show');
      const menuHideSpy = vi.spyOn(StatusMenu.prototype, 'hide');
      const menuDestroySpy = vi.spyOn(StatusMenu.prototype, 'destroy');
      const apiDestroySpy = vi.spyOn(Api.prototype, 'destroy');
      const dataDestroySpy = vi.spyOn(Data.prototype, 'destroy');

      const ext = new SyncExtension({ uuid: 'my-ext@elhan.io' });
      setCurrentExtensionSpy.mockClear();
      ext.enable();

      expect(setCurrentExtensionSpy).toHaveBeenCalledWith(ext);
      expect(loadXmlSpy).toHaveBeenCalledWith('io.elhan.ExtensionsSync');
      expect(wrapSpy).toHaveBeenCalledWith('<node>interface</node>', ext);
      expect(DBusExportedObject.lastExported).toEqual({
        connection: DBus.session,
        path: '/io/elhan/ExtensionsSync',
      });
      expect(syncStartSpy).toHaveBeenCalled();
      expect(menuShowSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [extension] extension is enabled');
      expect((ext as any).dbus).toBeDefined();

      const saveSpy = vi.fn();
      const readSpy = vi.fn();
      (ext as any).eventEmitter.on(SyncEvent.SAVE, saveSpy);
      (ext as any).eventEmitter.on(SyncEvent.READ, readSpy);

      ext.save();
      expect(saveSpy).toHaveBeenCalled();

      ext.read();
      expect(readSpy).toHaveBeenCalled();

      // Disable
      const dbusUnexportSpy = vi.spyOn((ext as any).dbus, 'unexport');
      ext.disable();

      expect(syncStopSpy).toHaveBeenCalled();
      expect(menuDestroySpy).toHaveBeenCalled();
      expect(apiDestroySpy).toHaveBeenCalled();
      expect(dataDestroySpy).toHaveBeenCalled();
      expect(menuHideSpy).toHaveBeenCalled();
      expect(dbusUnexportSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [extension] extension is disabled');
      expect((ext as any).dbus).toBeUndefined();
      expect((ext as any).sync).toBeUndefined();
      expect((ext as any).statusMenu).toBeUndefined();
      expect((ext as any).api).toBeUndefined();
      expect((ext as any).data).toBeUndefined();
      expect((ext as any).eventEmitter).toBeUndefined();
    });

    it('enables without dbus export if loadInterfaceXML returns null', () => {
      vi.spyOn(shell, 'loadInterfaceXML').mockReturnValue(null);
      const ext = new SyncExtension({ uuid: 'my-ext@elhan.io' });
      ext.enable();

      expect((ext as any).dbus).toBeUndefined();

      // Disable without dbus should not throw
      expect(() => ext.disable()).not.toThrow();
    });

    it('disable when already disabled does not throw', () => {
      const ext = new SyncExtension({ uuid: 'my-ext@elhan.io' });
      expect(() => ext.disable()).not.toThrow();
    });
  });
});
