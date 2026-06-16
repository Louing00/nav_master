import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { AppMetadataService } from './app-metadata.service';
import { IconCacheService } from './icon-cache.service';
import { SiteMetadataService } from './site-metadata.service';

function createPrismaMock(app: Record<string, unknown>) {
  return {
    app: {
      findFirst: vi.fn().mockResolvedValue(app),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    setting: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ key: 'icon_auto_resolve_on_change', value: 'true' }]),
    },
  };
}

function createIconCacheMock() {
  return {
    isLocalIconUrl: vi.fn((value?: string | null) => Boolean(value?.startsWith('/api/public/app-icons/'))),
    isRemoteIconUrl: vi.fn((value?: string | null) => Boolean(value?.startsWith('http://') || value?.startsWith('https://'))),
    cacheRemoteIcon: vi.fn(async () => '/api/public/app-icons/cached.svg'),
  };
}

describe('AppMetadataService', () => {
  it('guards asynchronous metadata writes with the current URL', async () => {
    const prisma = createPrismaMock({
      name: '',
      resolvedName: null,
      description: '',
      resolvedDescription: null,
      icon: '',
      iconUrl: null,
      resolvedIconUrl: null,
    });
    const siteMetadata = {
      resolveMetadata: vi.fn().mockResolvedValue({
        resolvedName: 'New title',
        resolvedDescription: 'New description',
        resolvedIconUrl: 'https://new.example/icon.svg',
      }),
    };
    const iconCache = createIconCacheMock();
    const service = new AppMetadataService(
      prisma as unknown as PrismaService,
      siteMetadata as unknown as SiteMetadataService,
      iconCache as unknown as IconCacheService,
    );

    service.queueForAppChange(7, 12, 'https://new.example/');

    await vi.waitFor(() => expect(prisma.app.updateMany).toHaveBeenCalledOnce());
    expect(prisma.app.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 12, userId: 7, url: 'https://new.example/' },
      }),
    );
    expect(prisma.app.updateMany).toHaveBeenCalledWith({
      where: { id: 12, userId: 7, url: 'https://new.example/' },
      data: expect.objectContaining({
        resolvedName: 'New title',
        resolvedDescription: 'New description',
        resolvedIconUrl: '/api/public/app-icons/cached.svg',
      }),
    });
    expect(iconCache.cacheRemoteIcon).toHaveBeenCalledWith('https://new.example/icon.svg');
  });

  it('does not resolve metadata when all fields are manually supplied', async () => {
    const prisma = createPrismaMock({
      name: 'Manual title',
      resolvedName: null,
      description: 'Manual description',
      resolvedDescription: null,
      icon: '',
      iconUrl: 'https://example.com/manual.svg',
      resolvedIconUrl: null,
    });
    const siteMetadata = {
      resolveMetadata: vi.fn(),
      resolvePageMetadata: vi.fn(),
    };
    const iconCache = createIconCacheMock();
    const service = new AppMetadataService(
      prisma as unknown as PrismaService,
      siteMetadata as unknown as SiteMetadataService,
      iconCache as unknown as IconCacheService,
    );

    service.queueForAppChange(7, 12, 'https://example.com/');

    await vi.waitFor(() => expect(prisma.app.findFirst).toHaveBeenCalledOnce());
    expect(siteMetadata.resolveMetadata).not.toHaveBeenCalled();
    expect(siteMetadata.resolvePageMetadata).not.toHaveBeenCalled();
    expect(prisma.app.updateMany).not.toHaveBeenCalled();
  });

  it('migrates an existing resolved remote icon to the local cache', async () => {
    const prisma = createPrismaMock({
      name: 'Manual title',
      resolvedName: null,
      description: 'Manual description',
      resolvedDescription: null,
      icon: '',
      iconUrl: null,
      resolvedIconUrl: 'https://example.com/favicon.svg',
    });
    const siteMetadata = {
      resolveMetadata: vi.fn(),
      resolvePageMetadata: vi.fn(),
    };
    const iconCache = createIconCacheMock();
    const service = new AppMetadataService(
      prisma as unknown as PrismaService,
      siteMetadata as unknown as SiteMetadataService,
      iconCache as unknown as IconCacheService,
    );

    service.queueMissing(
      7,
      [
        {
          id: 12,
          name: 'Manual title',
          resolvedName: null,
          url: 'https://example.com/',
          description: 'Manual description',
          resolvedDescription: null,
          icon: '',
          iconUrl: null,
          resolvedIconUrl: 'https://example.com/favicon.svg',
        },
      ],
      false,
    );

    await vi.waitFor(() => expect(prisma.app.updateMany).toHaveBeenCalledOnce());
    expect(prisma.app.updateMany).toHaveBeenCalledWith({
      where: {
        id: 12,
        userId: 7,
        url: 'https://example.com/',
        resolvedIconUrl: 'https://example.com/favicon.svg',
      },
      data: expect.objectContaining({
        resolvedIconUrl: '/api/public/app-icons/cached.svg',
      }),
    });
    expect(siteMetadata.resolveMetadata).not.toHaveBeenCalled();
    expect(siteMetadata.resolvePageMetadata).not.toHaveBeenCalled();
  });
});
