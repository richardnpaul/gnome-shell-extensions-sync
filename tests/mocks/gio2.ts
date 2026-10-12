/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

export enum SubprocessFlags {
  NONE = 0,
  STDOUT_PIPE = 1 << 0,
  STDERR_PIPE = 1 << 1,
}

export enum FileCreateFlags {
  NONE = 0,
  PRIVATE = 1 << 0,
  REPLACE_DESTINATION = 1 << 1,
}

export enum SettingsBindFlags {
  DEFAULT = 0,
}

export class Subprocess {
  public argv: string[];
  public flags: SubprocessFlags;
  public inited = false;
  public static mockStdout: string | null = '';
  public static mockStderr: string | null = '';
  public static mockWaitCheckAsync = vi.fn().mockResolvedValue(true);
  public static lastInstance: Subprocess | null = null;

  constructor(options: { argv?: string[]; flags?: SubprocessFlags }) {
    if (!options?.argv || !Array.isArray(options.argv) || options.argv.length === 0) {
      throw new Error(`Invalid argv: ${JSON.stringify(options?.argv)}`);
    }
    if (options.flags !== SubprocessFlags.STDOUT_PIPE) {
      throw new Error(`Invalid flags: ${options?.flags}`);
    }
    this.argv = options.argv;
    this.flags = options.flags;
    Subprocess.lastInstance = this;
  }

  public static lastNewArgs: { argv: string[]; flags: SubprocessFlags } | null = null;

  static new(argv: string[], flags: SubprocessFlags): Subprocess {
    const proc = new Subprocess({ argv: ['bash', '-c', 'dummy'], flags: SubprocessFlags.STDOUT_PIPE });
    proc.argv = argv;
    proc.flags = flags;
    Subprocess.lastNewArgs = { argv, flags };
    return proc;
  }

  init(cancellable: any): boolean {
    if (cancellable !== null) {
      throw new Error('cancellable must be null');
    }
    this.inited = true;
    return true;
  }

  communicate_utf8_async(_stdin: any, _cancellable: any, callback: (proc: any, result: any) => void): void {
    if (!this.inited) {
      throw new Error('Process not initialized');
    }
    callback(this, {});
  }

  communicate_utf8_finish(_result: any): [boolean, string | null, string | null] {
    return [true, Subprocess.mockStdout, Subprocess.mockStderr];
  }

  wait_check_async(_cancellable: any): Promise<boolean> {
    return Subprocess.mockWaitCheckAsync();
  }
}

export class Settings {
  private values: Record<string, any> = {};
  public connect = vi.fn();
  public bind = vi.fn();

  constructor(values: Record<string, any> | string = {}) {
    if (typeof values === 'string') {
      this.values = {};
    } else {
      this.values = values;
    }
  }

  get_enum(key: string): number {
    return this.values[key] ?? 0;
  }

  get_string(key: string): string {
    return this.values[key] ?? '';
  }

  get_flags(key: string): number {
    return this.values[key] ?? 0;
  }

  get_boolean(key: string): boolean {
    return this.values[key] ?? false;
  }

  set_string(key: string, value: string): void {
    this.values[key] = value;
  }

  set_enum(key: string, value: number): void {
    this.values[key] = value;
  }

  set_flags(key: string, value: number): void {
    this.values[key] = value;
  }

  set_boolean(key: string, value: boolean): void {
    this.values[key] = value;
  }
}

export class File {
  private path: string;
  public static mockExists = true;
  public static mockFileContents: Map<string, Uint8Array> = new Map();
  public static mockContent: Uint8Array = new Uint8Array();
  public static mockLoadStatus = true;
  public static lastReplacedContents: Uint8Array | null = null;
  public static lastReplacedFlags: any = null;
  public static lastMakeBackup: boolean | null = null;

  constructor(path: string) {
    this.path = path;
  }

  static new_for_uri(uri: string): File {
    return new File(uri);
  }

  static new_for_path(path: string): File {
    return new File(path);
  }

  static new_tmp(_tmpl: string): [File, any] {
    const file = new File('/tmp/test-file');
    const stream = {
      output_stream: {
        write_bytes_async: vi.fn().mockResolvedValue(true),
      },
      close_async: vi.fn(),
    };
    return [file, stream];
  }

  query_exists(_cancellable: any): boolean {
    return File.mockExists;
  }

  replace_contents(contents: any, _etag: any, make_backup: any, flags: any, _cancellable: any): void {
    File.lastReplacedContents = contents;
    File.lastReplacedFlags = flags;
    File.lastMakeBackup = make_backup;
  }

  replace_contents_bytes_async(
    bytes: any,
    _etag: any,
    make_backup: any,
    flags: any,
    _cancellable: any,
    callback: any,
  ): void {
    File.lastReplacedContents = bytes?.get_data ? bytes.get_data() : bytes?.toArray ? bytes.toArray() : bytes;
    File.lastReplacedFlags = flags;
    File.lastMakeBackup = make_backup;
    if (callback) {
      callback(this, {});
    }
  }

  replace_contents_finish(_result: any): boolean {
    return true;
  }

  load_contents(_cancellable: any): [boolean, Uint8Array] {
    return [File.mockLoadStatus, File.mockContent];
  }

  load_contents_async(_cancellable: any, callback: any): void {
    if (callback) {
      callback(this, {});
    }
  }

  load_contents_finish(_result: any): [boolean, Uint8Array] {
    if (!File.mockLoadStatus) {
      throw new Error('Failed to load file contents');
    }
    const content = File.mockFileContents.get(this.path) ?? File.mockContent;
    return [true, content];
  }

  delete(_cancellable: any): boolean {
    return true;
  }

  get_path(): string | null {
    return this.path;
  }

  get_uri(): string {
    return this.path;
  }

  get_basename(): string {
    return this.path.split('/').pop() || '';
  }

  get_child(name: string): File {
    return new File(`${this.path}/${name}`);
  }

  make_directory_with_parents(_cancellable: any): boolean {
    return true;
  }

  create(_flags: any, _cancellable: any): any {
    return {};
  }
}

export const file_new_tmp = vi.fn((_tmpl: any): [File, any] => {
  const file = new File('/tmp/dconf-test');
  const ioStream = {
    close_async: vi.fn(),
  };
  return [file, ioStream];
});

export const icon_new_for_string = vi.fn((name: string) => ({ name }));

export enum DBusCallFlags {
  NONE = 0,
}

export const DBus = {
  session: {
    call: vi.fn(),
    call_finish: vi.fn(),
  },
};

export class DBusExportedObject {
  public static lastExported: { connection: any; path: string } | null = null;
  static wrapJSObject(_iface: any, _obj: any): DBusExportedObject {
    return new DBusExportedObject();
  }
  export(connection: any, path: string): void {
    DBusExportedObject.lastExported = { connection, path };
  }
  unexport(): void {}
}
