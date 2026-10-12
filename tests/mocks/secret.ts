/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

export const SchemaFlags = {
  NONE: 0,
};

export const SchemaAttributeType = {
  STRING: 0,
  INTEGER: 1,
  BOOLEAN: 2,
};

export const COLLECTION_DEFAULT = 'default';

export class Schema {
  public name: string;
  public flags: number;
  public attributes: Record<string, number>;

  constructor(name: string, flags: number, attributes: Record<string, number>) {
    this.name = name;
    this.flags = flags;
    this.attributes = attributes;
  }
}

export const mockStore = new Map<string, string>();

function attrKey(attributes: Record<string, string>): string {
  return JSON.stringify(attributes);
}

export const password_store = vi.fn(
  (_schema: any, attributes: any, _collection: any, _label: any, password: any, _cancellable: any, callback: any) => {
    mockStore.set(attrKey(attributes), password);
    if (callback) {
      callback(null, { success: true });
    }
  },
);

export const password_store_finish = vi.fn((_res: any) => true);

export const password_lookup = vi.fn((_schema: any, attributes: any, _cancellable: any, callback: any) => {
  const pass = mockStore.get(attrKey(attributes)) ?? null;
  if (callback) {
    callback(null, { password: pass });
  }
});

export const password_lookup_finish = vi.fn((res: any) => res?.password ?? null);

export const password_clear = vi.fn((_schema: any, attributes: any, _cancellable: any, callback: any) => {
  const existed = mockStore.delete(attrKey(attributes));
  if (callback) {
    callback(null, { success: existed });
  }
});

export const password_clear_finish = vi.fn((res: any) => res?.success ?? true);

export function resetMockSecret(): void {
  mockStore.clear();
  password_store.mockClear();
  password_store_finish.mockClear();
  password_lookup.mockClear();
  password_lookup_finish.mockClear();
  password_clear.mockClear();
  password_clear_finish.mockClear();
}

export default {
  SchemaFlags,
  SchemaAttributeType,
  COLLECTION_DEFAULT,
  Schema,
  password_store,
  password_store_finish,
  password_lookup,
  password_lookup_finish,
  password_clear,
  password_clear_finish,
  resetMockSecret,
};
