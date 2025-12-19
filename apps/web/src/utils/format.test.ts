import { describe, expect, it } from 'vitest';
import { formatStatus } from './format';

describe('formatStatus', () => {
  it('normalizes the status string', () => {
    expect(formatStatus(' ready ')).toBe('READY');
  });
});
