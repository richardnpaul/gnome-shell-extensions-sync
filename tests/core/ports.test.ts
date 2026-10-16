import { describe, it, expect } from 'vitest';
import * as Ports from '@esync/core/ports';

describe('Ports', () => {
  it('exports port definitions and CredentialType enum', () => {
    expect(Ports).toBeDefined();
    expect(Ports.CredentialType.TOKEN).toBe('token');
    expect(Ports.CredentialType.REMOTE_ID).toBe('remote_id');
  });
});
