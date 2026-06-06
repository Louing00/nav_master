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
        { tags: { contains: filters.keyword } },
      ];
    }

    const apps = await this.prisma.app.findMany({
      where,
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    this.queueMissingNameResolve(userId, apps);
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
    this.queueIconResolve(userId, app.id, app.url, app.icon, app.iconUrl);
    this.queueNameResolve(userId, app.id, app.url, app.name);
    return serialize(app);
  }

  async preview(url: string) {
    const [pageMetadata, resolvedIconUrl] = await Promise.all([
      this.appIconService.resolvePageMetadata(url),
      this.appIconService.resolve(url),
    ]);

    return {
      ...pageMetadata,
      resolvedIconUrl,
    };
  }

  async update(userId: number, id: number, dto: UpdateAppDto) {
    const existing = await this.ensureExists(userId, id);
    await this.ensureCategoryBelongsToUser(userId, dto.categoryId);
    const urlChanged = dto.url !== undefined && dto.url !== existing.url;
    const targetUrl = dto.url || existing.url;
    const targetIcon = dto.icon === undefined ? existing.icon : dto.icon;
    const targetIconUrl = dto.iconUrl === undefined ? existing.iconUrl : dto.iconUrl;
    const targetName = dto.name === undefined ? existing.name : normalizeManualName(dto.name);
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
        resolvedIconUrl: urlChanged ? null : undefined,
        iconResolvedAt: urlChanged ? null : undefined,
        healthStatus: healthDisabled || urlChanged ? 'unknown' : undefined,
        healthCheckedAt: healthDisabled || urlChanged ? null : undefined,
        healthLatencyMs: healthDisabled || urlChanged ? null : undefined,
        healthError: healthDisabled || urlChanged ? null : undefined,
      },
      include: { category: true },
    });
    if (urlChanged) {
      this.queueIconResolve(userId, app.id, targetUrl, targetIcon, targetIconUrl);
    }
    if (!hasManualAppName(targetName, targetUrl)) {
      this.queueNameResolve(userId, app.id, targetUrl, targetName);
    }
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
      data: await this.resolveIconCache(existing.url),
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

  private async resolveIconCache(url: string) {
    return {
      resolvedIconUrl: await this.appIconService.resolve(url),
      iconResolvedAt: new Date(),
    };
  }

  private async resolveNameCache(url: string) {
    return {
      resolvedName: await this.appIconService.resolveName(url),
      nameResolvedAt: new Date(),
    };
  }

  private queueIconResolve(userId: number, id: number, url: string, icon?: string | null, iconUrl?: string | null) {
    if (hasManualIcon(icon, iconUrl)) {
      return;
    }

    void this.resolveAndCacheIconWhenEnabled(userId, id, url);
  }

  private queueNameResolve(userId: number, id: number, url: string, name?: string | null) {
    if (hasManualAppName(name, url)) {
      return;
    }

    void this.resolveAndCacheName(userId, id, url);
  }

  private queueMissingNameResolve(userId: number, apps: Array<{ id: number; url: string; name?: string | null; resolvedName?: string | null }>) {
    for (const app of apps) {
      if (app.resolvedName || hasManualAppName(app.name, app.url) || !shouldRetryAppNameResolve(userId, app.id, app.url)) {
        continue;
      }

      void this.resolveAndCacheName(userId, app.id, app.url);
    }
  }

  private async resolveAndCacheIconWhenEnabled(userId: number, id: number, url: string) {
    try {
      if (!(await this.iconAutoResolveOnChangeEnabled(userId))) {
        return;
      }

      await this.resolveAndCacheIcon(userId, id, url);
    } catch {
      // Icon cache refresh is best-effort; creating or updating an app should stay fast.
    }
  }

  private async resolveAndCacheIcon(userId: number, id: number, url: string) {
    try {
      const iconCache = await this.resolveIconCache(url);
      await this.prisma.app.updateMany({
        where: {
          id,
          userId,
          url,
          AND: [{ OR: [{ icon: null }, { icon: '' }, { icon: DEFAULT_TEXT_ICON }] }],
          OR: [{ iconUrl: null }, { iconUrl: '' }],
        },
        data: iconCache,
      });
    } catch {
      // Icon cache refresh is best-effort; creating or updating an app should stay fast.
    }
  }

  private async resolveAndCacheName(userId: number, id: number, url: string) {
    try {
      const nameCache = await this.resolveNameCache(url);
      await this.prisma.app.updateMany({
        where: {
          id,
          userId,
          url,
          OR: [{ resolvedName: null }, { resolvedName: '' }],
        },
        data: nameCache,
      });
    } catch {
      // Name cache refresh is best-effort; creating or updating an app should stay fast.
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
