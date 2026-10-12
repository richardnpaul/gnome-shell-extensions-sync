/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

export const PRIORITY_DEFAULT = 0;

export const Source = {
  remove: vi.fn((_id: number) => true),
};

export const timeout_add = vi.fn().mockImplementation((_priority: number, _millis: number, func: () => boolean) => {
  func();
  return 123;
});

export const file_get_contents = vi.fn((_path: string): [boolean, Uint8Array] => [true, new Uint8Array()]);
export const get_user_data_dir = vi.fn(() => '/home/user/.local/share');
export const build_filenamev = vi.fn((args: string[]) => args.join('/'));

export class Bytes {
  private data: Uint8Array;
  constructor(data: Uint8Array) {
    this.data = data;
  }
  get_data(): Uint8Array | null {
    return this.data;
  }
}
