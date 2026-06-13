import { describe, expect, it } from 'vitest';
import {
  appNeedsResolvedMetadata,
  getAppDisplayDescription,
  getAppDisplayName,
  isFallbackName,
} from './appName';

describe('app display metadata', () => {
  it('prefers a manual name over the resolved name', () => {
    expect(
      getAppDisplayName({
        name: '手动名称',
        resolvedName: '自动名称',
        url: 'https://example.com',
      }),
    ).toBe('手动名称');
  });

  it('uses the resolved name when the stored name is only a URL fallback', () => {
    expect(
      getAppDisplayName({
        name: 'example.com',
        resolvedName: 'Example',
        url: 'https://example.com/',
      }),
    ).toBe('Example');
    expect(isFallbackName('https://example.com', 'https://example.com/')).toBe(true);
  });

  it('falls back to the hostname when no name is available', () => {
    expect(getAppDisplayName({ name: '', resolvedName: null, url: 'https://www.example.com/path' })).toBe(
      'example.com',
    );
  });

  it('prefers a manual description over the resolved description', () => {
    expect(
      getAppDisplayDescription({
        description: '手动简介',
        resolvedDescription: '自动简介',
      }),
    ).toBe('手动简介');
  });

  it('only requests metadata when the display values are still missing', () => {
    expect(
      appNeedsResolvedMetadata({
        id: 1,
        name: 'example.com',
        resolvedName: null,
        url: 'https://example.com',
        description: '',
        resolvedDescription: null,
      }),
    ).toBe(true);
    expect(
      appNeedsResolvedMetadata({
        id: 1,
        name: '手动名称',
        resolvedName: null,
        url: 'https://example.com',
        description: '手动简介',
        resolvedDescription: null,
      }),
    ).toBe(false);
  });
});
