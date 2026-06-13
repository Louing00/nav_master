import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  iconAutoResolveOnChangeEnabled,
  settingsRowsToMap,
} from '../settings/site-settings';
import { hasManualAppName, shouldRetryAppNameResolve } from './app-name.util';
import { SiteMetadataService } from './site-metadata.service';

const DEFAULT_TEXT_ICON = '⌁';

type MetadataCandidate = {
  id: number;
  url: string;
  name?: string | null;
  resolvedName?: string | null;
  description?: string | null;
  resolvedDescription?: string | null;
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
  ) {}

  preview(url: string) {
    return this.siteMetadata.resolveMetadata(url);
  }

  queueForAppChange(userId: number, id: number, url: string) {
    this.queueResolve(userId, id, url, true);
  }

  queueMissing(userId: number, apps: MetadataCandidate[], includeIcon: boolean) {
    for (const app of apps) {
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
    return this.prisma.app.update({
      where: { id },
      data: {
        resolvedIconUrl: await this.siteMetadata.resolve(app.url, { force: true }),
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

    return this.prisma.app.update({
      where: { id },
      data: {
        resolvedIconUrl,
        iconResolvedAt: new Date(),
      },
      include: { category: true },
    });
  }

  private queueResolve(userId: number, id: number, url: string, includeIcon: boolean) {
    void this.resolveAndCache(userId, id, url, includeIcon);
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
        data.resolvedIconUrl = metadata.resolvedIconUrl;
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
