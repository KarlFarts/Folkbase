import { describe, it, expect } from 'vitest';
import { generateId, ID_PREFIXES } from '../idGenerator';

describe('generateId', () => {
  it('returns a string with the correct prefix', () => {
    const id = generateId('CON');
    expect(id).toMatch(/^CON-[0-9a-f]{8}$/);
  });

  it('generates unique IDs on repeated calls', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId('CON'));
    }
    expect(ids.size).toBe(1000);
  });

  it('works with all defined prefixes', () => {
    for (const prefix of Object.values(ID_PREFIXES)) {
      const id = generateId(prefix);
      expect(id.startsWith(`${prefix}-`)).toBe(true);
      expect(id).toMatch(new RegExp(`^${prefix}-[0-9a-f]{8}$`));
    }
  });

  it('throws on empty prefix', () => {
    expect(() => generateId('')).toThrow();
  });
});
