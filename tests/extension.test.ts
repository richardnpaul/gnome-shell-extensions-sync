import { describe, it, expect, beforeEach, vi } from 'vitest';
import SyncExtension from '@esync/extension';
import { SyncEvent } from '@esync/api/types';
import * as shell from '@esync/shell';
import { Settings, DBus, DBusExportedObject } from '@gi-types/gio2';
import { Sync } from '@esync/sync';
import { StatusMenu } from '@esync/panel/statusMenu';
import { Api } from '@esync/api';
import { Data } from '@esync/data';
import { CredentialMigrator } from '@esync/platform/credentials/credentialMigration';
import { SecretCredentialStore } from '@esync/platform/credentials/secretCredentialStore';
import { InMemoryCredentialStore } from '@esync/platform/credentials/inMemoryCredentialStore';

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
    const initTranslationsSpy = vi.spyOn(SyncExtension.prototype, 'initTranslations');
    const logSpy = vi.spyOn(globalThis as any, 'log');
    const ext = new SyncExtension({ uuid: 'extensions-sync@richardnpaul.github.com' });
    expect(initTranslationsSpy).toHaveBeenCalled();
    expect(shell.getCurrentExtension()).toBe(ext);
    expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [extension] extension is initialized');
  });

  it('save and read do nothing before enable is called', () => {
    const ext = new SyncExtension({ uuid: 'extensions-sync@richardnpaul.github.com' });
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
      const migrateSpy = vi.spyOn(CredentialMigrator.prototype, 'migrate').mockResolvedValue(undefined);

      const ext = new SyncExtension({ uuid: 'extensions-sync@richardnpaul.github.com' });
      setCurrentExtensionSpy.mockClear();
      ext.enable();

      expect(migrateSpy).toHaveBeenCalled();
      expect(setCurrentExtensionSpy).toHaveBeenCalledWith(ext);
      expect(loadXmlSpy).toHaveBeenCalledWith('com.github.richardnpaul.ExtensionsSync');
      expect(wrapSpy).toHaveBeenCalledWith('<node>interface</node>', ext);
      expect(DBusExportedObject.lastExported).toEqual({
        connection: DBus.session,
        path: '/com/github/richardnpaul/ExtensionsSync',
      });
      expect(syncStartSpy).toHaveBeenCalled();
      expect(menuShowSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [extension] extension is enabled');
      expect((ext as any).dbus).toBeDefined();
      expect((ext as any).credentialStore).toBeInstanceOf(SecretCredentialStore);

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
      const ext = new SyncExtension({ uuid: 'extensions-sync@richardnpaul.github.com' });
      ext.enable();

      expect((ext as any).dbus).toBeUndefined();

      // Disable without dbus should not throw
      expect(() => ext.disable()).not.toThrow();
    });

    it('handles migration error cleanly during enable', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      vi.spyOn(CredentialMigrator.prototype, 'migrate').mockRejectedValueOnce(new Error('Migration failed'));
      const ext = new SyncExtension({ uuid: 'extensions-sync@richardnpaul.github.com' });
      ext.enable();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('credential migration error: Error: Migration failed'),
      );
    });

    it('uses provided credentialStore when passed to enable', () => {
      const ext = new SyncExtension({ uuid: 'extensions-sync@richardnpaul.github.com' });
      const customStore = new InMemoryCredentialStore();
      ext.enable(customStore);
      expect((ext as any).credentialStore).toBe(customStore);
      ext.disable();
    });

    it('disable when already disabled does not throw', () => {
      const ext = new SyncExtension({ uuid: 'extensions-sync@richardnpaul.github.com' });
      expect(() => ext.disable()).not.toThrow();
    });
  });
});
