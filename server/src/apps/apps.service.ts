import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppIconService } from './app-icon.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { HealthCheckService } from './health-check.service';
import { hasManualAppName, normalizeManualName, shouldRetryAppNameResolve } from './app-name.util';

function parseTags(tags?: string | null): string[] {
  if (!tags) {
    return [];
  }

  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function serialize(app: any) {
  return {
    ...app,
    tags: parseTags(app.tags),
  };
}

const DEFAULT_TEXT_ICON = '⌁';

function hasManualIcon(icon?: string | null, iconUrl?: string | null) {
  const textIcon = icon?.trim();
  return Boolean(iconUrl?.trim() || (textIcon && textIcon !== DEFAULT_TEXT_ICON));
}

@Injectable()
export class AppsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appIconService: AppIconService,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  async list(userId: number, filters: { keyword?: string; categoryId?: number; visible?: boolean }) {
    const where: Prisma.AppWhereInput = { userId };
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters.visible !== undefined) {
      where.visible = filters.visible;
    }
    if (filters.keyword) {
      where.OR = [
        { name: { contains: filters.keyword } },
        { resolvedName: { contains: filters.keyword } },
        { description: { contains: filters.keyword } },
        { resolvedDescription: { contains: filters.keyword } },
        { tags: { contains: filters.keyword } },
      ];
    }

    const apps = await this.prisma.app.findMany({
      where,
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    this.queueMissingMetadataResolve(userId, apps);
    return apps.map(serialize);
  }

  async create(userId: number, dto: CreateAppDto) {
    await this.ensureCategoryBelongsToUser(userId, dto.categoryId);
    const { tags, name, ...payload } = dto;
    const app = await this.prisma.app.create({
      data: {
        ...payload,
        name: normalizeManualName(name),
        tags: JSON.stringify(tags || []),
        userId,
      },
      include: { category: true },
    });
    this.queueMetadataResolve(userId, app.id, app.url);
    return serialize(app);
  }

  async preview(url: string) {
    return this.appIconService.resolveMetadata(url);
  }

  async update(userId: number, id: number, dto: UpdateAppDto) {
    const existing = await this.ensureExists(userId, id);
    await this.ensureCategoryBelongsToUser(userId, dto.categoryId);
    const urlChanged = dto.url !== undefined && dto.url !== existing.url;
    const targetUrl = dto.url || existing.url;
    const healthDisabled = dto.healthEnabled === false;
    const { tags, name, ...payload } = dto;
    const app = await this.prisma.app.update({
      where: { id },
      data: {
        ...payload,
        name: name === undefined ? undefined : normalizeManualName(name),
        tags: tags === undefined ? undefined : JSON.stringify(tags),
        resolvedName: urlChanged ? null : undefined,
        nameResolvedAt: urlChanged ? null : undefined,
        resolvedDescription: urlChanged ? null : undefined,
        descriptionResolvedAt: urlChanged ? null : undefined,
        resolvedIconUrl: urlChanged ? null : undefined,
        iconResolvedAt: urlChanged ? null : undefined,
        healthStatus: healthDisabled || urlChanged ? 'unknown' : undefined,
        healthCheckedAt: healthDisabled || urlChanged ? null : undefined,
        healthLatencyMs: healthDisabled || urlChanged ? null : undefined,
        healthError: healthDisabled || urlChanged ? null : undefined,
      },
      include: { category: true },
    });
    this.queueMetadataResolve(userId, app.id, targetUrl);
    return serialize(app);
  }

  async checkHealth(userId: number, id: number) {
    return serialize(await this.healthCheckService.checkApp(userId, id));
  }

  async checkAllHealth(userId: number) {
    const apps = await this.healthCheckService.checkAll(userId);
    return apps.map(serialize);
  }

  async refreshIcon(userId: number, id: number) {
    const existing = await this.ensureExists(userId, id);
    const app = await this.prisma.app.update({
      where: { id },
      data: await this.resolveIconCache(existing.url, true),
      include: { category: true },
    });
    return serialize(app);
  }

  async cacheBrowserResolvedIcon(userId: number, id: number, resolvedIconUrl: string) {
    const existing = await this.ensureExists(userId, id);
    if (!this.appIconService.isBrowserCandidate(existing.url, resolvedIconUrl)) {
      throw new BadRequestException('图标地址不在允许的浏览器候选范围内');
    }

    const app = await this.prisma.app.update({
      where: { id },
      data: {
        resolvedIconUrl,
        iconResolvedAt: new Date(),
      },
      include: { category: true },
    });
    return serialize(app);
  }

  async remove(userId: number, id: number) {
    await this.ensureExists(userId, id);
    await this.prisma.app.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(userId: number, id: number) {
    const exists = await this.prisma.app.findFirst({ where: { id, userId } });
    if (!exists) {
      throw new NotFoundException('应用不存在');
    }
    return exists;
  }

  private async ensureCategoryBelongsToUser(userId: number, categoryId?: number | null) {
    if (!categoryId) {
      return;
    }

    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) {
      throw new BadRequestException('分类不存在或无权使用');
    }
  }

  private async resolveIconCache(url: string, force = false) {
    return {
      resolvedIconUrl: await this.appIconService.resolve(url, { force }),
      iconResolvedAt: new Date(),
    };
  }

  private queueMetadataResolve(userId: number, id: number, url: string) {
    void this.resolveAndCacheMetadata(userId, id, url);
  }

  private queueMissingMetadataResolve(
    userId: number,
    apps: Array<{
      id: number;
      url: string;
      name?: string | null;
      resolvedName?: string | null;
      description?: string | null;
      resolvedDescription?: string | null;
    }>,
  ) {
    for (const app of apps) {
      const needsName = !app.resolvedName?.trim() && !hasManualAppName(app.name, app.url);
      const needsDescription = !app.description?.trim() && !app.resolvedDescription?.trim();
      if ((!needsName && !needsDescription) || !shouldRetryAppNameResolve(userId, app.id, app.url)) {
        continue;
      }

      this.queueMetadataResolve(userId, app.id, app.url);
    }
  }

  private async resolveAndCacheMetadata(userId: number, id: number, url: string) {
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
        !app.resolvedIconUrl?.trim() &&
        !hasManualIcon(app.icon, app.iconUrl) &&
        (await this.iconAutoResolveOnChangeEnabled(userId));
      if (!needsName && !needsDescription && !needsIcon) {
        return;
      }

      const metadata = needsIcon
        ? await this.appIconService.resolveMetadata(url)
        : {
            ...(await this.appIconService.resolvePageMetadata(url)),
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
      // Metadata refresh is best-effort; creating or updating an app should stay fast.
    }
  }

  private async iconAutoResolveOnChangeEnabled(userId: number) {
    const rows = await this.prisma.setting.findMany({
      where: { userId, key: { in: ['icon_auto_resolve_on_change', 'icon_resolve_mode'] } },
    });
    const settings = rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value || '';
      return acc;
    }, {});

    if (settings.icon_auto_resolve_on_change !== undefined) {
      return settings.icon_auto_resolve_on_change !== 'false';
    }

    return settings.icon_resolve_mode !== 'server_only';
  }
}
