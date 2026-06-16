import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IconCacheService } from './icon-cache.service';

const originalIconCacheDir = process.env.ICON_CACHE_DIR;

afterEach(() => {
  if (originalIconCacheDir === undefined) {
    delete process.env.ICON_CACHE_DIR;
  } else {
    process.env.ICON_CACHE_DIR = originalIconCacheDir;
  }
  vi.unstubAllGlobals();
});

describe('IconCacheService', () => {
  it('downloads a remote icon and exposes a stable local URL', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'atlasgate-icons-'));
    process.env.ICON_CACHE_DIR = cacheDir;
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const service = new IconCacheService();
    const localUrl = await service.cacheRemoteIcon('https://example.com/favicon.png');

    expect(localUrl).toMatch(/^\/api\/public\/app-icons\/[a-f0-9]{32}\.png$/);
    const file = await service.getCachedIcon(localUrl!.split('/').pop()!);
    expect(file?.contentType).toBe('image/png');
    await expect(readFile(file!.path)).resolves.toEqual(Buffer.from([1, 2, 3]));

    fetchMock.mockClear();
    await expect(service.cacheRemoteIcon('https://example.com/favicon.png')).resolves.toBe(localUrl);
    expect(fetchMock).not.toHaveBeenCalled();

    await rm(cacheDir, { recursive: true, force: true });
  });
});
