import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getExtensionIds,
  getAllExtensionConfigData,
  removeExtension,
  installExtension,
  getXmlParser,
  readSchemaAsJson,
} from '@esync/data/providers/extensions/utils';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ExtensionDownloader from 'resource:///org/gnome/shell/ui/extensionDownloader.js';
import * as ExtensionUtils from 'resource:///org/gnome/shell/misc/extensionUtils.js';
import * as shell from '@esync/shell';
import * as utils from '@esync/utils';
import * as glib from '@gi-types/glib2';
import { Session, Status } from '@gi-types/soup3';
import { File, Subprocess } from '@gi-types/gio2';

describe('data/providers/extensions/utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    File.mockFileContents.clear();
    shell.setCurrentExtension({
      metadata: { uuid: 'extensions-sync@richardnpaul.github.com' },
    });
  });

  describe('getExtensionIds and getAllExtensions', () => {
    it('returns user extensions excluding self', () => {
      vi.mocked(Main.extensionManager.getUuids).mockReturnValue([
        'extensions-sync@richardnpaul.github.com',
        'user-ext@gnome.org',
        'system-ext@gnome.org',
        'nonexistent-ext@gnome.org',
      ]);
      vi.mocked(Main.extensionManager.lookup).mockImplementation((uuid: string) => {
        if (uuid === 'extensions-sync@richardnpaul.github.com') {
          return { type: ExtensionUtils.ExtensionType.PER_USER, metadata: { uuid } };
        }
        if (uuid === 'user-ext@gnome.org') {
          return { type: ExtensionUtils.ExtensionType.PER_USER, metadata: { uuid }, path: '/path/user-ext' };
        }
        if (uuid === 'system-ext@gnome.org') {
          return { type: ExtensionUtils.ExtensionType.SYSTEM, metadata: { uuid }, path: '/path/system-ext' };
        }
        return null;
      });

      const ids = getExtensionIds();
      expect(ids).toEqual(['user-ext@gnome.org']);
    });

    it('falls back to default uuid when getCurrentExtension is null or metadata is null', () => {
      shell.setCurrentExtension(null);
      vi.mocked(Main.extensionManager.getUuids).mockReturnValue([
        'extensions-sync@richardnpaul.github.com',
        'other@gnome.org',
      ]);
      vi.mocked(Main.extensionManager.lookup).mockImplementation((uuid: string) => ({
        type: ExtensionUtils.ExtensionType.PER_USER,
        metadata: { uuid },
      }));

      let ids = getExtensionIds();
      expect(ids).toEqual(['other@gnome.org']);

      shell.setCurrentExtension({ metadata: null as any });
      ids = getExtensionIds();
      expect(ids).toEqual(['other@gnome.org']);
    });
  });

  describe('getAllExtensionConfigData and getExtensionSchemas', () => {
    it('extracts schemas and dconf config data for all extensions', async () => {
      vi.mocked(Main.extensionManager.getUuids).mockReturnValue(['my-ext@gnome.org']);
      vi.mocked(Main.extensionManager.lookup).mockReturnValue({
        type: ExtensionUtils.ExtensionType.PER_USER,
        metadata: { uuid: 'my-ext@gnome.org' },
        path: '/ext/path',
      });

      const execSpy = vi.spyOn(utils, 'execute').mockResolvedValue('/ext/path/schema1.xml\n/ext/path/schema2.xml');

      const xmlSingle = `
        <schemalist>
          <schema path="/org/gnome/shell/extensions/my-ext/">
          </schema>
        </schemalist>
      `;
      const xmlMulti = `
        <schemalist>
          <schema path="/org/gnome/shell/extensions/my-ext/sub1/">
          </schema>
          <schema path="/org/gnome/shell/extensions/my-ext/sub2/">
          </schema>
          <schema id="no-path">
          </schema>
        </schemalist>
      `;

      File.mockFileContents.set('/ext/path/schema1.xml', new TextEncoder().encode(xmlSingle));
      File.mockFileContents.set('/ext/path/schema2.xml', new TextEncoder().encode(xmlMulti));

      vi.spyOn(shell, 'readDconfData').mockImplementation(async (schema) => `dconf-data-for-${schema}`);

      const configData = await getAllExtensionConfigData();
      expect(execSpy).toHaveBeenCalledWith('find -L /ext/path -iname "*.xml" -exec grep -l "schemalist" {} +');
      expect(configData).toEqual({
        'my-ext@gnome.org': {
          '/org/gnome/shell/extensions/my-ext/': 'dconf-data-for-/org/gnome/shell/extensions/my-ext/',
          '/org/gnome/shell/extensions/my-ext/sub1/': 'dconf-data-for-/org/gnome/shell/extensions/my-ext/sub1/',
          '/org/gnome/shell/extensions/my-ext/sub2/': 'dconf-data-for-/org/gnome/shell/extensions/my-ext/sub2/',
        },
      });
    });

    it('handles empty stdout or error from find command', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      vi.mocked(Main.extensionManager.getUuids).mockReturnValue(['ext-empty@gnome.org']);
      vi.mocked(Main.extensionManager.lookup).mockReturnValue({
        type: ExtensionUtils.ExtensionType.PER_USER,
        metadata: { uuid: 'ext-empty@gnome.org' },
        path: '/ext/path',
      });

      vi.spyOn(utils, 'execute').mockRejectedValue(new Error('find failed'));
      let configData = await getAllExtensionConfigData();
      expect(configData).toEqual({ 'ext-empty@gnome.org': {} });
      expect(logSpy).toHaveBeenCalledWith(
        '[extensions-sync] [extension-utils] error occurred while getting extension schemas: Error: find failed',
      );

      const newForPathSpy = vi.spyOn(File, 'new_for_path');
      vi.spyOn(utils, 'execute').mockResolvedValue('');
      configData = await getAllExtensionConfigData();
      expect(configData).toEqual({ 'ext-empty@gnome.org': {} });
      expect(newForPathSpy).not.toHaveBeenCalled();
    });

    it('handles extension when lookup returns null or without path without calling execute or debug', async () => {
      const execSpy = vi.spyOn(utils, 'execute');
      const logSpy = vi.spyOn(globalThis as any, 'log');
      vi.mocked(Main.extensionManager.getUuids).mockReturnValue(['nopath@gnome.org']);
      vi.mocked(Main.extensionManager.lookup).mockImplementation((uuid: string) => {
        return {
          type: ExtensionUtils.ExtensionType.PER_USER,
          metadata: { uuid },
        };
      });

      const configData = await getAllExtensionConfigData();
      expect(configData).toEqual({ 'nopath@gnome.org': {} });
      expect(execSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('handles lookup returning null inside getExtensionSchemas without calling execute', async () => {
      const execSpy = vi.spyOn(utils, 'execute');
      const logSpy = vi.spyOn(globalThis as any, 'log');
      vi.mocked(Main.extensionManager.getUuids).mockReturnValue(['ext-null-schema@gnome.org']);
      let callCount = 0;
      vi.mocked(Main.extensionManager.lookup).mockImplementation((uuid: string) => {
        callCount++;
        if (callCount <= 2) {
          return { type: ExtensionUtils.ExtensionType.PER_USER, metadata: { uuid }, path: '/ext/path' };
        }
        return null;
      });

      const configData = await getAllExtensionConfigData();
      expect(configData).toEqual({ 'ext-null-schema@gnome.org': {} });
      expect(execSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('handles single schema without path or invalid schemalist in xml', async () => {
      vi.mocked(Main.extensionManager.getUuids).mockReturnValue(['single-nopath@gnome.org']);
      vi.mocked(Main.extensionManager.lookup).mockReturnValue({
        type: ExtensionUtils.ExtensionType.PER_USER,
        metadata: { uuid: 'single-nopath@gnome.org' },
        path: '/ext/path',
      });

      vi.spyOn(utils, 'execute').mockResolvedValue(
        '/ext/path/schema.xml\n/ext/path/schema-empty.xml\n/ext/path/not-schemalist.xml',
      );
      const xml1 = '<schemalist><schema id="no-path-single"></schema></schemalist>';
      const xmlEmpty = '<schemalist></schemalist>';
      const xmlNotSchemalist = '<otherroot></otherroot>';
      File.mockFileContents.set('/ext/path/schema-empty.xml', new TextEncoder().encode(xmlEmpty));
      File.mockFileContents.set('/ext/path/not-schemalist.xml', new TextEncoder().encode(xmlNotSchemalist));
      File.mockFileContents.set('/ext/path/schema.xml', new TextEncoder().encode(xml1));

      const configData = await getAllExtensionConfigData();
      expect(configData).toEqual({ 'single-nopath@gnome.org': {} });
    });

    it('filters out extension when lookup returns null or not PER_USER in getAllExtensions', async () => {
      vi.mocked(Main.extensionManager.getUuids).mockReturnValue(['ext1@gnome.org']);
      let lookupCount = 0;
      vi.mocked(Main.extensionManager.lookup).mockImplementation((uuid: string) => {
        lookupCount++;
        // First call from getExtensionIds
        if (lookupCount === 1) {
          return { type: ExtensionUtils.ExtensionType.PER_USER, metadata: { uuid }, path: '/ext/path' };
        }
        // Second call from getAllExtensions
        return { type: ExtensionUtils.ExtensionType.SYSTEM, metadata: { uuid }, path: '/ext/path' };
      });

      const configData = await getAllExtensionConfigData();
      expect(configData).toEqual({});
    });

    it('handles readDconfData failure gracefully', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      vi.mocked(Main.extensionManager.getUuids).mockReturnValue(['err-dconf@gnome.org']);
      vi.mocked(Main.extensionManager.lookup).mockReturnValue({
        type: ExtensionUtils.ExtensionType.PER_USER,
        metadata: { uuid: 'err-dconf@gnome.org' },
        path: '/ext/path',
      });

      vi.spyOn(utils, 'execute').mockResolvedValue('/ext/path/schema.xml');
      const xml = '<schemalist><schema path="/org/test/"></schema></schemalist>';
      File.mockFileContents.set('/ext/path/schema.xml', new TextEncoder().encode(xml));

      vi.spyOn(shell, 'readDconfData').mockRejectedValue(new Error('dconf dump error'));

      const configData = await getAllExtensionConfigData();
      expect(configData).toEqual({ 'err-dconf@gnome.org': {} });
      expect(logSpy).toHaveBeenCalledWith(
        '[extensions-sync] [extension-utils] cannot dump settings for err-dconf@gnome.org:/org/test/',
      );
    });

    it('handles error in readSchemaAsJson gracefully when schema file read fails', async () => {
      vi.mocked(Main.extensionManager.getUuids).mockReturnValue(['fail-schema@gnome.org']);
      vi.mocked(Main.extensionManager.lookup).mockReturnValue({
        type: ExtensionUtils.ExtensionType.PER_USER,
        metadata: { uuid: 'fail-schema@gnome.org' },
        path: '/ext/path',
      });

      vi.spyOn(utils, 'execute').mockResolvedValue('/ext/path/failing-schema.xml');
      vi.spyOn(utils, 'readFileContentsAsync').mockRejectedValueOnce(new Error('Cannot read file'));

      const configData = await getAllExtensionConfigData();
      expect(configData).toEqual({ 'fail-schema@gnome.org': {} });
    });
  });

  describe('removeExtension', () => {
    it('uninstalls extension using ExtensionDownloader and logs removal', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      removeExtension('some-ext@gnome.org');
      expect(ExtensionDownloader.uninstallExtension).toHaveBeenCalledWith('some-ext@gnome.org');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [extension-utils] removed extension some-ext@gnome.org');
    });
  });

  describe('installExtension', () => {
    it('downloads, extracts, loads, and enables extension successfully', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = new glib.Bytes(new Uint8Array([1, 2, 3]));
      File.mockExists = true;
      const makeDirSpy = vi.spyOn(File.prototype, 'make_directory_with_parents');
      const newTmpSpy = vi.spyOn(File, 'new_tmp');
      const extObj = { uuid: 'new-ext@gnome.org' };
      vi.mocked(Main.extensionManager.createExtensionObject).mockReturnValue(extObj);
      vi.mocked(Main.extensionManager.loadExtension).mockResolvedValue(undefined);
      vi.mocked(Main.extensionManager.enableExtension).mockReturnValue(true);

      await installExtension('new-ext@gnome.org');

      expect(makeDirSpy).not.toHaveBeenCalled();
      expect(newTmpSpy).toHaveBeenCalledWith('XXXXXX.shell-extension.zip');
      expect(newTmpSpy.mock.results[0].value[1].close_async).toHaveBeenCalledWith(glib.PRIORITY_DEFAULT, null);
      expect(glib.build_filenamev).toHaveBeenCalledWith([
        '/home/user/.local/share',
        'gnome-shell',
        'extensions',
        'new-ext@gnome.org',
      ]);
      expect(Session.lastMessage?.method).toBe('GET');
      expect(Session.lastMessage?.uri).toBe(
        'https://extensions.gnome.org/download-extension/new-ext@gnome.org.shell-extension.zip?shell_version=50.1',
      );
      expect(Main.extensionManager.createExtensionObject).toHaveBeenCalled();
      expect(Main.extensionManager.loadExtension).toHaveBeenCalledWith(extObj);
      expect(Main.extensionManager.enableExtension).toHaveBeenCalledWith('new-ext@gnome.org');
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('error occurred during installation'));
    });

    it('creates destination directory if it does not exist', async () => {
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = new glib.Bytes(new Uint8Array([1, 2, 3]));
      File.mockExists = false;
      const makeDirSpy = vi.spyOn(File.prototype, 'make_directory_with_parents');

      vi.mocked(Main.extensionManager.createExtensionObject).mockReturnValue({});
      vi.mocked(Main.extensionManager.loadExtension).mockResolvedValue(undefined);
      vi.mocked(Main.extensionManager.enableExtension).mockReturnValue(true);

      await installExtension('mkdir-ext@gnome.org');
      expect(makeDirSpy).toHaveBeenCalled();
    });

    it('handles null get_path during archive extraction', async () => {
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = new glib.Bytes(new Uint8Array([1, 2, 3]));
      const origGetPath = File.prototype.get_path;
      File.prototype.get_path = vi.fn().mockReturnValue(null);

      vi.mocked(Main.extensionManager.createExtensionObject).mockReturnValue({});
      vi.mocked(Main.extensionManager.loadExtension).mockResolvedValue(undefined);
      vi.mocked(Main.extensionManager.enableExtension).mockReturnValue(true);

      await installExtension('null-path-ext@gnome.org');
      expect(Subprocess.lastNewArgs?.argv).toEqual(['unzip', '-uod', '', '--', '']);
      File.prototype.get_path = origGetPath;
    });

    it('handles null schemasPath.get_path when schemas directory exists', async () => {
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = new glib.Bytes(new Uint8Array([1, 2, 3]));
      const origGetChild = File.prototype.get_child;
      File.prototype.get_child = vi.fn().mockImplementation((name: string) => {
        const child = new File('/path/' + name);
        if (name === 'schemas') {
          vi.spyOn(child, 'query_exists').mockReturnValue(true);
          vi.spyOn(child, 'get_path').mockReturnValue(null);
        }
        return child;
      });

      vi.mocked(Main.extensionManager.createExtensionObject).mockReturnValue({});
      vi.mocked(Main.extensionManager.loadExtension).mockResolvedValue(undefined);
      vi.mocked(Main.extensionManager.enableExtension).mockReturnValue(true);

      await installExtension('null-schema-path@gnome.org');
      expect(Subprocess.lastNewArgs?.argv).toEqual(['glib-compile-schemas', '']);
      File.prototype.get_child = origGetChild;
    });

    it('handles non-OK download status', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      Session.mockStatusCode = Status.NOT_FOUND;
      await installExtension('nonexistent@gnome.org');
      expect(Main.extensionManager.createExtensionObject).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[extensions-sync] [extension-utils] error occurred during installation of nonexistent@gnome.org. Error: Error: Unexpected response: Not Found',
        ),
      );
    });

    it('handles schema compilation failure during extract', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = new glib.Bytes(new Uint8Array([1, 2, 3]));

      File.mockExists = true;
      let callCount = 0;
      Subprocess.mockWaitCheckAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('glib-compile-schemas failed'));
        }
        return Promise.resolve(true);
      });

      vi.mocked(Main.extensionManager.createExtensionObject).mockReturnValue({});
      vi.mocked(Main.extensionManager.loadExtension).mockResolvedValue(undefined);
      vi.mocked(Main.extensionManager.enableExtension).mockReturnValue(true);

      await installExtension('failed-schema-ext@gnome.org');
      expect(Main.extensionManager.createExtensionObject).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[extensions-sync] [extension-utils] error compiling schema for failed-schema-ext@gnome.org: Error: glib-compile-schemas failed',
        ),
      );
    });

    it('handles enableExtension returning false', async () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      Session.mockStatusCode = Status.OK;
      Session.mockResponseBytes = new glib.Bytes(new Uint8Array([1, 2, 3]));
      vi.mocked(Main.extensionManager.createExtensionObject).mockReturnValue({});
      vi.mocked(Main.extensionManager.loadExtension).mockResolvedValue(undefined);
      vi.mocked(Main.extensionManager.enableExtension).mockReturnValue(false);

      await installExtension('cannot-enable@gnome.org');
      expect(Main.extensionManager.enableExtension).toHaveBeenCalledWith('cannot-enable@gnome.org');
      expect(logSpy).toHaveBeenCalledWith(
        '[extensions-sync] [extension-utils] error occurred during installation of cannot-enable@gnome.org. Error: Error: Cannot enable cannot-enable@gnome.org',
      );
    });
  });

  describe('getXmlParser', () => {
    it('creates and caches XMLParser instance', () => {
      const p1 = getXmlParser();
      const p2 = getXmlParser();
      expect(p1).toBe(p2);
      expect(p1).toBeDefined();
    });
  });

  describe('readSchemaAsJson', () => {
    it('returns parsed json on valid xml file', async () => {
      File.mockFileContents.set(
        '/valid.xml',
        new TextEncoder().encode('<schemalist><schema path="/test/"></schema></schemalist>'),
      );
      const result = await readSchemaAsJson('/valid.xml');
      expect(result).toEqual({ schemalist: { schema: { '@_path': '/test/' } } });
    });

    it('returns null on failure', async () => {
      vi.spyOn(utils, 'readFileContentsAsync').mockRejectedValueOnce(new Error('read error'));
      const result = await readSchemaAsJson('/nonexistent.xml');
      expect(result).toBeNull();
    });
  });
});
