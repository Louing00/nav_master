import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { AppMetadataService } from './app-metadata.service';
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
    const service = new AppMetadataService(
      prisma as unknown as PrismaService,
      siteMetadata as unknown as SiteMetadataService,
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
        resolvedIconUrl: 'https://new.example/icon.svg',
      }),
    });
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
    const service = new AppMetadataService(
      prisma as unknown as PrismaService,
      siteMetadata as unknown as SiteMetadataService,
    );

    service.queueForAppChange(7, 12, 'https://example.com/');

    await vi.waitFor(() => expect(prisma.app.findFirst).toHaveBeenCalledOnce());
    expect(siteMetadata.resolveMetadata).not.toHaveBeenCalled();
    expect(siteMetadata.resolvePageMetadata).not.toHaveBeenCalled();
    expect(prisma.app.updateMany).not.toHaveBeenCalled();
  });
});
