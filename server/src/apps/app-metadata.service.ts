import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  iconAutoResolveOnChangeEnabled,
  settingsRowsToMap,
} from '../settings/site-settings';
import { hasManualAppName, shouldRetryAppNameResolve } from './app-name.util';
import { IconCacheService } from './icon-cache.service';
import { SiteMetadataService } from './site-metadata.service';

const DEFAULT_TEXT_ICON = '⌁';

type MetadataCandidate = {
  id: number;
  url: string;
  name?: string | null;
  resolvedName?: string | null;
  description?: string | null;
  resolvedDescription?: string | null;
  icon?: string | null;
  iconUrl?: string | null;
  resolvedIconUrl?: string | null;
};

function hasManualIcon(icon?: string | null, iconUrl?: string | null) {
  const textIcon = icon?.trim();
  return Boolean(iconUrl?.trim() || (textIcon && textIcon !== DEFAULT_TEXT_ICON));
}

@Injectable()
export class AppMetadataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteMetadata: SiteMetadataService,
    private readonly iconCache: IconCacheService,
  ) {}

  preview(url: string) {
    return this.siteMetadata.resolveMetadata(url);
  }

  queueForAppChange(userId: number, id: number, url: string) {
    this.queueResolve(userId, id, url, true);
  }

  queueMissing(userId: number, apps: MetadataCandidate[], includeIcon: boolean) {
    for (const app of apps) {
      const resolvedIconUrl = app.resolvedIconUrl?.trim();
      if (resolvedIconUrl && this.iconCache.isRemoteIconUrl(resolvedIconUrl) && !hasManualIcon(app.icon, app.iconUrl)) {
        this.queueExistingIconCache(userId, app.id, app.url, resolvedIconUrl);
      }

      const needsName = !app.resolvedName?.trim() && !hasManualAppName(app.name, app.url);
      const needsDescription = !app.description?.trim() && !app.resolvedDescription?.trim();
      if ((!needsName && !needsDescription) || !shouldRetryAppNameResolve(userId, app.id, app.url)) {
        continue;
      }

      this.queueResolve(userId, app.id, app.url, includeIcon);
    }
  }

  async refreshIcon(userId: number, id: number) {
    const app = await this.findOwnedApp(userId, id);
    const resolvedIconUrl = await this.cacheResolvedIcon(await this.siteMetadata.resolve(app.url, { force: true }));
    return this.prisma.app.update({
      where: { id },
      data: {
        resolvedIconUrl,
        iconResolvedAt: new Date(),
      },
      include: { category: true },
    });
  }

  async cacheBrowserResolvedIcon(
    userId: number,
    id: number,
    resolvedIconUrl: string,
    options: { requireAutoResolveEnabled?: boolean; publicRequest?: boolean } = {},
  ) {
    if (options.requireAutoResolveEnabled && !(await this.autoResolveEnabled(userId))) {
      throw new ForbiddenException('当前模式不允许浏览器写入图标缓存');
    }

    const app = await this.findOwnedApp(userId, id, options.publicRequest);
    if (!this.siteMetadata.isBrowserCandidate(app.url, resolvedIconUrl)) {
      throw new BadRequestException('图标地址不在允许的浏览器候选范围内');
    }

    const cachedIconUrl = await this.cacheResolvedIcon(resolvedIconUrl);
    return this.prisma.app.update({
      where: { id },
      data: {
        resolvedIconUrl: cachedIconUrl,
        iconResolvedAt: new Date(),
      },
      include: { category: true },
    });
  }

  private queueResolve(userId: number, id: number, url: string, includeIcon: boolean) {
    void this.resolveAndCache(userId, id, url, includeIcon);
  }

  private queueExistingIconCache(userId: number, id: number, url: string, resolvedIconUrl: string) {
    void this.cacheExistingResolvedIcon(userId, id, url, resolvedIconUrl);
  }

  private async cacheExistingResolvedIcon(userId: number, id: number, url: string, resolvedIconUrl: string) {
    try {
      const cachedIconUrl = await this.cacheResolvedIcon(resolvedIconUrl);
      if (!cachedIconUrl || cachedIconUrl === resolvedIconUrl) {
        return;
      }

      await this.prisma.app.updateMany({
        where: { id, userId, url, resolvedIconUrl },
        data: {
          resolvedIconUrl: cachedIconUrl,
          iconResolvedAt: new Date(),
        },
      });
    } catch {
      // Icon cache migration is best-effort; reads should stay fast.
    }
  }

  private async resolveAndCache(userId: number, id: number, url: string, includeIcon: boolean) {
    try {
      const app = await this.prisma.app.findFirst({
        where: { id, userId, url },
        select: {
          name: true,
          resolvedName: true,
          description: true,
          resolvedDescription: true,
          icon: true,
          iconUrl: true,
          resolvedIconUrl: true,
        },
      });
      if (!app) {
        return;
      }

      const needsName = !app.resolvedName?.trim() && !hasManualAppName(app.name, url);
      const needsDescription = !app.description?.trim() && !app.resolvedDescription?.trim();
      const needsIcon =
        includeIcon &&
        !app.resolvedIconUrl?.trim() &&
        !hasManualIcon(app.icon, app.iconUrl) &&
        (await this.autoResolveEnabled(userId));
      if (!needsName && !needsDescription && !needsIcon) {
        return;
      }

      const metadata = needsIcon
        ? await this.siteMetadata.resolveMetadata(url)
        : {
            ...(await this.siteMetadata.resolvePageMetadata(url)),
            resolvedIconUrl: null,
          };
      const resolvedAt = new Date();
      const data: Prisma.AppUpdateManyMutationInput = {};

      if (needsName) {
        data.resolvedName = metadata.resolvedName;
        data.nameResolvedAt = resolvedAt;
      }
      if (needsDescription) {
        data.resolvedDescription = metadata.resolvedDescription;
        data.descriptionResolvedAt = resolvedAt;
      }
      if (needsIcon) {
        data.resolvedIconUrl = await this.cacheResolvedIcon(metadata.resolvedIconUrl);
        data.iconResolvedAt = resolvedAt;
      }

      await this.prisma.app.updateMany({
        where: { id, userId, url },
        data,
      });
    } catch {
      // Metadata refresh is best-effort; app reads and writes should stay fast.
    }
  }

  private async cacheResolvedIcon(resolvedIconUrl?: string | null) {
    if (!resolvedIconUrl?.trim() || this.iconCache.isLocalIconUrl(resolvedIconUrl)) {
      return resolvedIconUrl || null;
    }

    if (!this.iconCache.isRemoteIconUrl(resolvedIconUrl)) {
      return null;
    }

    return this.iconCache.cacheRemoteIcon(resolvedIconUrl);
  }

  private async autoResolveEnabled(userId: number) {
    const rows = await this.prisma.setting.findMany({
      where: { userId, key: { in: ['icon_auto_resolve_on_change', 'icon_resolve_mode'] } },
    });
    return iconAutoResolveOnChangeEnabled(settingsRowsToMap(rows));
  }

  private async findOwnedApp(userId: number, id: number, publicRequest = false) {
    const app = await this.prisma.app.findFirst({ where: { id, userId } });
    if (!app) {
      if (publicRequest) {
        throw new BadRequestException('应用不存在');
      }
      throw new NotFoundException('应用不存在');
    }
    return app;
  }
}
