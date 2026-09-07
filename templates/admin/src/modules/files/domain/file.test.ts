import { describe, expect, it } from 'vitest';
import { validateFile } from './file';
describe('upload limits', () => {
  it('accepts the exact limit, rejects empty and oversized payloads', () => {
    expect(validateFile({ name: 'a.txt', size: 5 * 1024 * 1024 })).toBeNull();
    expect(validateFile({ name: 'a.txt', size: 5 * 1024 * 1024 + 1 })).not.toBeNull();
    expect(validateFile({ name: 'a.txt', size: 0 })).not.toBeNull();
  });
});
