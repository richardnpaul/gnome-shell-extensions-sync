import { describe, it, expect } from 'vitest';
import * as Ports from '@esync/core/ports';

describe('Ports', () => {
  it('exports port definitions', () => {
    expect(Ports).toBeDefined();
  });
});
