import { vi } from 'vitest';

export const notify = vi.fn();

export const panel = {
  addToStatusArea: vi.fn(),
};

export const extensionManager = {
  lookup: vi.fn(),
  getUuids: vi.fn(() => []),
  createExtensionObject: vi.fn(),
  loadExtension: vi.fn(),
  enableExtension: vi.fn(() => true),
};
