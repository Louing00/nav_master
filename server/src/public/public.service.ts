import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AppIconService } from '../apps/app-icon.service';
import { HealthCheckService } from '../apps/health-check.service';
import { PrismaService } from '../prisma/prisma.service';

const NEGATIVE_ICON_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const ICON_CACHE_RESPONSE_BUDGET_MS = 1200;

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

function serializeApp(app: any) {
  return {
    id: app.id,
    name: app.name,
    url: app.url,
    description: app.description,
    icon: app.icon,
    iconUrl: app.iconUrl,
    resolvedIconUrl: app.resolvedIconUrl,
    iconResolvedAt: app.iconResolvedAt,
    tags: parseTags(app.tags),
    openInNewTab: app.openInNewTab,
    healthStatus: app.healthStatus,
    healthCheckedAt: app.healthCheckedAt,
    healthLatencyMs: app.healthLatencyMs,
    healthError: app.healthError,
    healthEnabled: app.healthEnabled,
  };
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appIconService: AppIconService,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  async config(userId: number) {
    await this.prisma.ensureUserWorkspace(userId);
    const rows = await this.prisma.setting.findMany({ where: { userId } });
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value || '';
      return acc;
    }, {});
  }

  async apps(userId: number) {
    await this.prisma.ensureUserWorkspace(userId);
    const categories = await this.prisma.category.findMany({
      where: { visible: true, userId },
      include: {
        apps: {
          where: { visible: true, userId },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    await this.ensureIconCache(userId, categories.flatMap((category) => category.apps));

    const grouped = categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        apps: category.apps.map(serializeApp),
      }))
      .filter((category) => category.apps.length > 0);

    const uncategorized = await this.prisma.app.findMany({
      where: { visible: true, categoryId: null, userId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    await this.ensureIconCache(userId, uncategorized);

    if (uncategorized.length) {
      grouped.push({
        id: 0,
        name: '未分类',
        description: '尚未归类的系统入口',
        icon: '·',
        apps: uncategorized.map(serializeApp),
      });
    }

    return grouped;
  }

  async checkCategoryHealth(userId: number, categoryId: number) {
    await this.prisma.ensureUserWorkspace(userId);
    if (categoryId !== 0) {
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, userId, visible: true },
        select: { id: true },
      });
      if (!category) {
        return [];
      }
    }

    const apps = await this.prisma.app.findMany({
      where: {
        userId,
        visible: true,
        healthEnabled: true,
        categoryId: categoryId === 0 ? null : categoryId,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    const checked = [];
    for (const app of apps) {
      checked.push(await this.healthCheckService.checkApp(userId, app.id));
    }

    return checked.map(serializeApp);
  }

  async reorderApps(userId: number, categoryId: number, appIds: number[]) {
    await this.prisma.ensureUserWorkspace(userId);
    const settings = await this.config(userId);
    if (settings.home_quick_sort_enabled !== 'true') {
      throw new ForbiddenException('首页快捷排序未开启');
    }

    if (!Array.isArray(appIds) || appIds.length === 0 || appIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new BadRequestException('排序数据无效');
    }

    if (categoryId !== 0) {
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, userId, visible: true },
        select: { id: true },
      });
      if (!category) {
        throw new BadRequestException('分类不存在或不可排序');
      }
    }

    const categoryWhere = categoryId === 0 ? null : categoryId;
    const apps = await this.prisma.app.findMany({
      where: { userId, visible: true, categoryId: categoryWhere },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const existingIds = apps.map((app) => app.id);
    const existingIdSet = new Set(existingIds);
    const uniqueAppIds = [...new Set(appIds)];

    if (uniqueAppIds.length !== appIds.length || uniqueAppIds.length !== existingIds.length || uniqueAppIds.some((id) => !existingIdSet.has(id))) {
      throw new BadRequestException('排序数据与当前分类不匹配');
    }

    await this.prisma.$transaction(
      uniqueAppIds.map((id, index) =>
        this.prisma.app.updateMany({
          where: { id, userId, categoryId: categoryWhere },
          data: { sortOrder: (index + 1) * 10 },
        }),
      ),
    );

    return { success: true };
  }

  async cacheBrowserResolvedIcon(userId: number, id: number, resolvedIconUrl: string) {
    await this.prisma.ensureUserWorkspace(userId);
    const settings = await this.config(userId);
    if (settings.icon_resolve_mode === 'server_only') {
      throw new ForbiddenException('当前模式不允许浏览器写入图标缓存');
    }

    const app = await this.prisma.app.findFirst({ where: { id, userId }, select: { id: true, url: true } });
    if (!app) {
      throw new BadRequestException('应用不存在');
    }

    if (!this.appIconService.isBrowserCandidate(app.url, resolvedIconUrl)) {
      throw new BadRequestException('图标地址不在允许的浏览器候选范围内');
    }

    await this.prisma.app.update({
      where: { id },
      data: {
        resolvedIconUrl,
        iconResolvedAt: new Date(),
      },
    });

    return { success: true };
  }

  private async ensureIconCache(
    userId: number,
    apps: Array<{ id: number; url: string; iconUrl?: string | null; resolvedIconUrl?: string | null; iconResolvedAt?: Date | null }>,
  ) {
    const tasks = apps.filter((app) => this.shouldResolveIcon(app)).map((app) => this.resolveAndCacheIcon(userId, app));
    await Promise.race([Promise.allSettled(tasks), new Promise((resolve) => setTimeout(resolve, ICON_CACHE_RESPONSE_BUDGET_MS))]);
  }

  private async resolveAndCacheIcon(
    userId: number,
    app: { id: number; url: string; iconUrl?: string | null; resolvedIconUrl?: string | null; iconResolvedAt?: Date | null },
  ) {
    try {
      const resolvedIconUrl = await this.appIconService.resolve(app.url);
      const iconResolvedAt = new Date();
      await this.prisma.app.updateMany({
        where: {
          id: app.id,
          userId,
          url: app.url,
          OR: [{ iconUrl: null }, { iconUrl: '' }],
        },
        data: {
          resolvedIconUrl,
          iconResolvedAt,
        },
      });
      app.resolvedIconUrl = resolvedIconUrl;
      app.iconResolvedAt = iconResolvedAt;
    } catch {
      // Icon cache refresh is best-effort; app listing should never fail because of it.
    }
  }

  private shouldResolveIcon(app: { iconUrl?: string | null; resolvedIconUrl?: string | null; iconResolvedAt?: Date | null }) {
    if (app.iconUrl) {
      return false;
    }

    if (app.resolvedIconUrl) {
      return false;
    }

    if (!app.iconResolvedAt) {
      return true;
    }

    return Date.now() - new Date(app.iconResolvedAt).getTime() > NEGATIVE_ICON_CACHE_TTL_MS;
  }
}
