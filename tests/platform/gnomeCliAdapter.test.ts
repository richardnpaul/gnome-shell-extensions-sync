import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GnomeCliAdapter } from '@esync/platform/extensions/gnomeCliAdapter';
import { Subprocess, FileCreateFlags, file_new_tmp, File } from '@gi-types/gio2';
import { PRIORITY_DEFAULT } from '@gi-types/glib2';
import * as utils from '@esync/utils';

describe('GnomeCliAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Subprocess.mockStdout = '';
    Subprocess.mockStderr = '';
  });

  describe('listUserExtensions', () => {
    it('returns array of trimmed uuids from stdout', async () => {
      Subprocess.mockStdout = '  \n ext-1@test.com \n\n ext-2@test.com \n  \n';
      const adapter = new GnomeCliAdapter();
      const list = await adapter.listUserExtensions();

      expect(Subprocess.lastInstance?.argv).toEqual(['bash', '-c', 'gnome-extensions list --user']);
      expect(list).toEqual(['ext-1@test.com', 'ext-2@test.com']);
    });

    it('returns empty array when stdout is empty', async () => {
      Subprocess.mockStdout = '';
      const adapter = new GnomeCliAdapter();
      const list = await adapter.listUserExtensions();

      expect(list).toEqual([]);
    });

    it('returns empty array and logs error when execute rejects', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      Subprocess.mockStderr = 'command failed';
      const adapter = new GnomeCliAdapter();
      const list = await adapter.listUserExtensions();

      expect(list).toEqual([]);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[extensions-sync] [gnome-cli] error listing user extensions: command failed'),
      );
    });
  });

  describe('uninstallExtension', () => {
    it('calls gnome-extensions uninstall command and logs success', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      Subprocess.mockStdout = '';
      const adapter = new GnomeCliAdapter();
      await adapter.uninstallExtension('my-uuid@test');

      expect(Subprocess.lastInstance?.argv).toEqual(['bash', '-c', 'gnome-extensions uninstall "my-uuid@test"']);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [gnome-cli] uninstalled extension: my-uuid@test');
    });

    it('catches and logs error when uninstall fails', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      Subprocess.mockStderr = 'uninstall error';
      const adapter = new GnomeCliAdapter();
      await adapter.uninstallExtension('my-uuid@test');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[extensions-sync] [gnome-cli] error uninstalling extension my-uuid@test: uninstall error',
        ),
      );
    });
  });

  describe('installExtension', () => {
    it('writes temp zip, installs, enables, and cleans up temp files', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const deleteSpy = vi.spyOn(File.prototype, 'delete');
      const execSpy = vi.spyOn(utils, 'execute');
      Subprocess.mockStdout = '';
      const adapter = new GnomeCliAdapter();
      const zipBytes = new Uint8Array([1, 2, 3]);

      await adapter.installExtension('target-uuid@test', zipBytes);

      const [mockTmpFile, mockIoStream] = file_new_tmp.mock.results[0].value;
      expect(File.lastReplacedContents).toEqual(zipBytes);
      expect(File.lastReplacedFlags).toBe(FileCreateFlags.REPLACE_DESTINATION);
      expect(File.lastMakeBackup).toBe(false);
      expect(execSpy).toHaveBeenCalledWith(`gnome-extensions install --force "${mockTmpFile.get_path()}"`);
      expect(execSpy).toHaveBeenCalledWith('gnome-extensions enable "target-uuid@test"');
      expect(deleteSpy).toHaveBeenCalledWith(null);
      expect(mockIoStream.close_async).toHaveBeenCalledWith(PRIORITY_DEFAULT, null);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [gnome-cli] installed extension: target-uuid@test');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [gnome-cli] enabled extension: target-uuid@test');
    });

    it('cleans up temp files and logs error if install fails', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const deleteSpy = vi.spyOn(File.prototype, 'delete');
      Subprocess.mockStderr = 'install crashed';
      const adapter = new GnomeCliAdapter();
      const zipBytes = new Uint8Array([4, 5, 6]);

      await adapter.installExtension('fail-uuid@test', zipBytes);

      const [, mockIoStream] = file_new_tmp.mock.results[0].value;
      expect(deleteSpy).toHaveBeenCalledWith(null);
      expect(mockIoStream.close_async).toHaveBeenCalledWith(PRIORITY_DEFAULT, null);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[extensions-sync] [gnome-cli] error installing extension fail-uuid@test: install crashed',
        ),
      );
    });
  });

  describe('enableExtension', () => {
    it('executes enable command and returns true on success', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      Subprocess.mockStdout = '';
      const adapter = new GnomeCliAdapter();
      const result = await adapter.enableExtension('ext-uuid@test');

      expect(result).toBe(true);
      expect(Subprocess.lastInstance?.argv).toEqual(['bash', '-c', 'gnome-extensions enable "ext-uuid@test"']);
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [gnome-cli] enabled extension: ext-uuid@test');
    });

    it('returns false and logs error on failure', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      Subprocess.mockStderr = 'cannot enable';
      const adapter = new GnomeCliAdapter();
      const result = await adapter.enableExtension('ext-uuid@test');

      expect(result).toBe(false);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[extensions-sync] [gnome-cli] error enabling extension ext-uuid@test: cannot enable'),
      );
    });
  });
});
