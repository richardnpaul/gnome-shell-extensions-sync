import { describe, it, expect } from 'vitest';
import { SyncOperationStatus, SyncEvent, SyncProviderType } from '@esync/api/types';

describe('api/types', () => {
  it('defines SyncOperationStatus enum values', () => {
    expect(SyncOperationStatus.SUCCESS).toBe(0);
    expect(SyncOperationStatus.FAIL).toBe(1);
  });

  it('defines SyncEvent enum values', () => {
    expect(SyncEvent.SAVE).toBe('SAVE');
    expect(SyncEvent.SAVE_FINISHED).toBe('SAVE_FINISHED');
    expect(SyncEvent.READ).toBe('READ');
    expect(SyncEvent.READ_FINISHED).toBe('READ_FINISHED');
  });

  it('defines SyncProviderType enum values', () => {
    expect(SyncProviderType.GITHUB).toBe(0);
    expect(SyncProviderType.GITLAB).toBe(1);
    expect(SyncProviderType.LOCAL).toBe(2);
  });
});
