import { describe, it, expect } from 'vitest';
import { generateId, ID_PREFIXES } from '../idGenerator';

describe('generateId', () => {
  it('produces a 16-character hex suffix', () => {
    const id = generateId('CON');
    const hex = id.replace('CON-', '');
    expect(hex).toHaveLength(16);
    expect(hex).toMatch(/^[0-9a-f]{16}$/);
  });

  it('produces unique IDs across many generations', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId('CON')));
    expect(ids.size).toBe(1000);
  });

  it('respects the ID prefix parameter', () => {
    const id = generateId('TP');
    expect(id).toMatch(/^TP-[0-9a-f]{16}$/);
  });
});
