import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logger,
  setTimeout,
  clearTimeout,
  execute,
  settingsFlagsToEnumList,
  enumListToSettingsFlags,
  readFileContentsAsync,
  replaceFileContentsAsync,
  format,
} from '@esync/utils';
import { Subprocess, File } from '@gi-types/gio2';
import { timeout_add, Source } from '@gi-types/glib2';

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logger', () => {
    it('calls log with correct prefix and content', () => {
      const logSpy = vi.spyOn(globalThis as any, 'log');
      const logFn = logger('my-prefix');
      logFn('hello world');
      expect(logSpy).toHaveBeenCalledWith('[extensions-sync] [my-prefix] hello world');
    });
  });

  describe('setTimeout and clearTimeout', () => {
    it('schedules a timeout and invokes callback returning false', () => {
      let registeredFunc: (() => boolean) | null = null;
      vi.mocked(timeout_add).mockImplementation((_p, _m, fn) => {
        registeredFunc = fn;
        return 123;
      });
      const callback = vi.fn();
      const id = setTimeout(callback, 100);
      expect(id).toBe(123);
      expect(timeout_add).toHaveBeenCalledWith(0, 100, expect.any(Function));
      expect(registeredFunc).not.toBeNull();
      const returnValue = registeredFunc!();
      expect(callback).toHaveBeenCalled();
      expect(returnValue).toBe(false);
    });

    it('clears timeout using Source.remove', () => {
      const result = clearTimeout(456);
      expect(Source.remove).toHaveBeenCalledWith(456);
      expect(result).toBe(true);
    });
  });

  describe('execute', () => {
    it('executes command and resolves with trimmed stdout', async () => {
      Subprocess.mockStdout = '  result output  \n';
      Subprocess.mockStderr = '';
      const result = await execute('echo hi');
      expect(result).toBe('result output');
    });

    it('resolves empty string when stdout is empty', async () => {
      Subprocess.mockStdout = '';
      Subprocess.mockStderr = '';
      const result = await execute('true');
      expect(result).toBe('');
    });

    it('resolves empty string when stdout is null', async () => {
      Subprocess.mockStdout = null;
      Subprocess.mockStderr = null;
      const result = await execute('true');
      expect(result).toBe('');
    });

    it('rejects when stderr is present', async () => {
      Subprocess.mockStdout = '';
      Subprocess.mockStderr = 'something went wrong';
      await expect(execute('fail')).rejects.toBe('something went wrong');
    });
  });

  describe('settingsFlagsToEnumList and enumListToSettingsFlags', () => {
    it('converts flags number to list of enum indices', () => {
      // 0b101 = 5 -> indices [0, 2]
      expect(settingsFlagsToEnumList(5)).toEqual([0, 2]);
      // 0b111 = 7 -> indices [0, 1, 2]
      expect(settingsFlagsToEnumList(7)).toEqual([0, 1, 2]);
      // 0 -> []
      expect(settingsFlagsToEnumList(0)).toEqual([]);
    });

    it('converts list of enum indices to settings flags number', () => {
      expect(enumListToSettingsFlags([0, 2])).toBe(5);
      expect(enumListToSettingsFlags([0, 1, 2])).toBe(7);
      expect(enumListToSettingsFlags([])).toBe(0);
    });

    it('round-trips between flags and enum lists', () => {
      const flags = 13; // 1 + 4 + 8 = bits 0, 2, 3
      const enums = settingsFlagsToEnumList(flags);
      expect(enums).toEqual([0, 2, 3]);
      expect(enumListToSettingsFlags(enums)).toBe(flags);
    });
  });

  describe('readFileContentsAsync', () => {
    it('loads file contents asynchronously', async () => {
      const file = new File('/test/file');
      File.mockContent = new TextEncoder().encode('file-content');
      File.mockLoadStatus = true;

      const contents = await readFileContentsAsync(file);
      expect(new TextDecoder().decode(contents)).toBe('file-content');
    });

    it('rejects when load_contents_finish throws', async () => {
      const file = new File('/test/file');
      File.mockLoadStatus = false;

      await expect(readFileContentsAsync(file)).rejects.toThrow();
    });
  });

  describe('replaceFileContentsAsync', () => {
    it('replaces file contents asynchronously', async () => {
      const file = new File('/test/file');
      const data = new TextEncoder().encode('new-data');

      await replaceFileContentsAsync(file, data);
      expect(File.lastReplacedContents).toEqual(data);
    });

    it('rejects when replace_contents_finish throws', async () => {
      const file = new File('/test/file');
      const data = new TextEncoder().encode('new-data');
      vi.spyOn(file, 'replace_contents_finish').mockImplementation(() => {
        throw new Error('replace failed');
      });

      await expect(replaceFileContentsAsync(file, data)).rejects.toThrow('replace failed');
    });
  });

  describe('format', () => {
    it('formats string with single %s placeholder', () => {
      expect(format('Hello %s', 'World')).toBe('Hello World');
    });

    it('formats string with multiple %s placeholders', () => {
      expect(format('%s has %s items', 'User', 5)).toBe('User has 5 items');
    });

    it('returns original string when no placeholders exist', () => {
      expect(format('No placeholders here')).toBe('No placeholders here');
    });

    it('handles more placeholders than arguments', () => {
      expect(format('Missing %s %s', 'one')).toBe('Missing one ');
    });
  });
});
