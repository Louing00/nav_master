import { describe, expect, it } from 'vitest';
import { decodeAppTags, encodeAppTags } from './app-record';

describe('app tag codec', () => {
  it('decodes stored JSON tags', () => {
    expect(decodeAppTags('["mail","自建"]')).toEqual(['mail', '自建']);
  });

  it('returns an empty list for invalid stored values', () => {
    expect(decodeAppTags('not-json')).toEqual([]);
    expect(decodeAppTags('{"tag":"mail"}')).toEqual([]);
    expect(decodeAppTags(null)).toEqual([]);
  });

  it('preserves comma-separated legacy tags when explicitly requested', () => {
    expect(decodeAppTags('mail, cloud, ', { allowLegacyCsv: true })).toEqual([
      'mail',
      'cloud',
    ]);
  });

  it('accepts arrays, JSON strings and legacy comma-separated input', () => {
    expect(encodeAppTags(['mail', 2])).toBe('["mail","2"]');
    expect(encodeAppTags('["mail","cloud"]')).toBe('["mail","cloud"]');
    expect(encodeAppTags('mail, cloud, ')).toBe('["mail","cloud"]');
  });
});
