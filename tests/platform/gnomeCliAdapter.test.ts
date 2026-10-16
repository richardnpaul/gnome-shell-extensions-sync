import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GnomeCliAdapter } from '@esync/platform/extensions/gnomeCliAdapter';
import { DBus, DBusCallFlags, FileCreateFlags, file_new_tmp, File } from '@gi-types/gio2';
import { PRIORITY_DEFAULT, Variant } from '@gi-types/glib2';
import * as utils from '@esync/utils';

describe('GnomeCliAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUserExtensions', () => {
    it('returns array of user extension uuids from DBus ListExtensions', async () => {
      const mockDict = {
        'user-1@test': { type: new Variant('i', 2) },
        'system-1@test': { type: new Variant('i', 1) },
        'user-2@test': { type: new Variant('i', 2) },
      };
      const mockReply = new Variant('a{sa{sv}}', [mockDict]);

      DBus.session.call = vi
        .fn()
        .mockImplementation((bus, path, iface, method, params, replyType, flags, timeout, cancel, callback) => {
          callback(DBus.session, null);
        });
      DBus.session.call_finish = vi.fn().mockReturnValue(mockReply);

      const adapter = new GnomeCliAdapter();
      const list = await adapter.listUserExtensions();

      expect(DBus.session.call).toHaveBeenCalledWith(
        'org.gnome.Shell.Extensions',
        '/org/gnome/Shell/Extensions',
        'org.gnome.Shell.Extensions',
        'ListExtensions',
        null,
        null,
        DBusCallFlags.NONE,
        -1,
        null,
        expect.any(Function),
      );
      expect(list).toEqual(['user-1@test', 'user-2@test']);
    });

    it('returns empty array when DBus returns empty dict', async () => {
      const mockReply = new Variant('a{sa{sv}}', [{}]);
      DBus.session.call = vi
        .fn()
        .mockImplementation((bus, path, iface, method, params, replyType, flags, timeout, cancel, callback) => {
          callback(DBus.session, null);
        });
      DBus.session.call_finish = vi.fn().mockReturnValue(mockReply);

      const adapter = new GnomeCliAdapter();
      const list = await adapter.listUserExtensions();

      expect(list).toEqual([]);
    });

    it('returns empty array and logs error when DBus call throws', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      DBus.session.call = vi
        .fn()
        .mockImplementation((bus, path, iface, method, params, replyType, flags, timeout, cancel, callback) => {
          callback(DBus.session, null);
        });
      DBus.session.call_finish = vi.fn().mockImplementation(() => {
        throw new Error('dbus failure');
      });

      const adapter = new GnomeCliAdapter();
      const list = await adapter.listUserExtensions();

      expect(list).toEqual([]);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[extensions-sync] [gnome-cli] error listing user extensions: Error: dbus failure'),
      );
    });
  });

  describe('uninstallExtension', () => {
    it('calls DBus UninstallExtension and logs success', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const mockReply = new Variant('(b)', [true]);

      DBus.session.call = vi
        .fn()
        .mockImplementation((bus, path, iface, method, params, replyType, flags, timeout, cancel, callback) => {
          callback(DBus.session, null);
        });
      DBus.session.call_finish = vi.fn().mockReturnValue(mockReply);

      const adapter = new GnomeCliAdapter();
      await adapter.uninstallExtension('my-uuid@test');

      expect(DBus.session.call).toHaveBeenCalledWith(
        'org.gnome.Shell.Extensions',
        '/org/gnome/Shell/Extensions',
        'org.gnome.Shell.Extensions',
        'UninstallExtension',
        new Variant('(s)', ['my-uuid@test']),
        null,
        DBusCallFlags.NONE,
        -1,
        null,
        expect.any(Function),
      );
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [gnome-cli] uninstalled extension: my-uuid@test');
    });

    it('catches and logs error when uninstall fails', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      DBus.session.call = vi
        .fn()
        .mockImplementation((bus, path, iface, method, params, replyType, flags, timeout, cancel, callback) => {
          callback(DBus.session, null);
        });
      DBus.session.call_finish = vi.fn().mockImplementation(() => {
        throw new Error('uninstall error');
      });

      const adapter = new GnomeCliAdapter();
      await adapter.uninstallExtension('my-uuid@test');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[extensions-sync] [gnome-cli] error uninstalling extension my-uuid@test: Error: uninstall error',
        ),
      );
    });
  });

  describe('installExtension', () => {
    it('writes temp zip, installs via direct binary execution, enables, and cleans up temp files', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const deleteSpy = vi.spyOn(File.prototype, 'delete');
      const execSpy = vi.spyOn(utils, 'execute').mockResolvedValue('');
      const adapter = new GnomeCliAdapter();
      const enableSpy = vi.spyOn(adapter, 'enableExtension').mockResolvedValue(true);
      const zipBytes = new Uint8Array([1, 2, 3]);

      await adapter.installExtension('target-uuid@test', zipBytes);

      const [mockTmpFile, mockIoStream] = file_new_tmp.mock.results[0].value;
      expect(File.lastReplacedContents).toEqual(zipBytes);
      expect(File.lastReplacedFlags).toBe(FileCreateFlags.REPLACE_DESTINATION);
      expect(File.lastMakeBackup).toBe(false);
      expect(execSpy).toHaveBeenCalledWith(['gnome-extensions', 'install', '--force', mockTmpFile.get_path()]);
      expect(enableSpy).toHaveBeenCalledWith('target-uuid@test');
      expect(deleteSpy).toHaveBeenCalledWith(null);
      expect(mockIoStream.close_async).toHaveBeenCalledWith(PRIORITY_DEFAULT, null);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [gnome-cli] installed extension: target-uuid@test');
    });

    it('cleans up temp files and logs error if install fails', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const deleteSpy = vi.spyOn(File.prototype, 'delete');
      vi.spyOn(utils, 'execute').mockRejectedValue(new Error('install crashed'));
      const adapter = new GnomeCliAdapter();
      const zipBytes = new Uint8Array([4, 5, 6]);

      await adapter.installExtension('fail-uuid@test', zipBytes);

      const [, mockIoStream] = file_new_tmp.mock.results[0].value;
      expect(deleteSpy).toHaveBeenCalledWith(null);
      expect(mockIoStream.close_async).toHaveBeenCalledWith(PRIORITY_DEFAULT, null);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[extensions-sync] [gnome-cli] error installing extension fail-uuid@test: Error: install crashed',
        ),
      );
    });
  });

  describe('enableExtension', () => {
    it('calls DBus EnableExtension and returns true on success', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const mockReply = new Variant('(b)', [true]);

      DBus.session.call = vi
        .fn()
        .mockImplementation((bus, path, iface, method, params, replyType, flags, timeout, cancel, callback) => {
          callback(DBus.session, null);
        });
      DBus.session.call_finish = vi.fn().mockReturnValue(mockReply);

      const adapter = new GnomeCliAdapter();
      const result = await adapter.enableExtension('ext-uuid@test');

      expect(result).toBe(true);
      expect(DBus.session.call).toHaveBeenCalledWith(
        'org.gnome.Shell.Extensions',
        '/org/gnome/Shell/Extensions',
        'org.gnome.Shell.Extensions',
        'EnableExtension',
        new Variant('(s)', ['ext-uuid@test']),
        null,
        DBusCallFlags.NONE,
        -1,
        null,
        expect.any(Function),
      );
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [gnome-cli] enabled extension: ext-uuid@test');
    });

    it('returns false and logs message when DBus EnableExtension returns false', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const mockReply = new Variant('(b)', [false]);

      DBus.session.call = vi
        .fn()
        .mockImplementation((bus, path, iface, method, params, replyType, flags, timeout, cancel, callback) => {
          callback(DBus.session, null);
        });
      DBus.session.call_finish = vi.fn().mockReturnValue(mockReply);

      const adapter = new GnomeCliAdapter();
      const result = await adapter.enableExtension('ext-uuid@test');

      expect(result).toBe(false);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [gnome-cli] failed to enable extension: ext-uuid@test');
    });

    it('returns false and logs error on DBus exception', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      DBus.session.call = vi
        .fn()
        .mockImplementation((bus, path, iface, method, params, replyType, flags, timeout, cancel, callback) => {
          callback(DBus.session, null);
        });
      DBus.session.call_finish = vi.fn().mockImplementation(() => {
        throw new Error('cannot enable');
      });

      const adapter = new GnomeCliAdapter();
      const result = await adapter.enableExtension('ext-uuid@test');

      expect(result).toBe(false);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[extensions-sync] [gnome-cli] error enabling extension ext-uuid@test: Error: cannot enable',
        ),
      );
    });
  });
});
