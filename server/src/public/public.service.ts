import { Injectable } from '@nestjs/common';
import { AppIconService } from '../apps/app-icon.service';
import { HealthCheckService } from '../apps/health-check.service';
import { PrismaService } from '../prisma/prisma.service';

const NEGATIVE_ICON_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
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

  private async ensureIconCache(
    userId: number,
    apps: Array<{ id: number; url: string; resolvedIconUrl?: string | null; iconResolvedAt?: Date | null }>,
  ) {
    const tasks = apps.filter((app) => this.shouldResolveIcon(app)).map((app) => this.resolveAndCacheIcon(userId, app));
    await Promise.race([Promise.allSettled(tasks), new Promise((resolve) => setTimeout(resolve, ICON_CACHE_RESPONSE_BUDGET_MS))]);
  }

  private async resolveAndCacheIcon(
    userId: number,
    app: { id: number; url: string; resolvedIconUrl?: string | null; iconResolvedAt?: Date | null },
  ) {
    try {
      const resolvedIconUrl = await this.appIconService.resolve(app.url);
      const iconResolvedAt = new Date();
      await this.prisma.app.updateMany({
        where: { id: app.id, userId },
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

  private shouldResolveIcon(app: { resolvedIconUrl?: string | null; iconResolvedAt?: Date | null }) {
    if (app.resolvedIconUrl) {
      return false;
    }

    if (!app.iconResolvedAt) {
      return true;
    }

    return Date.now() - new Date(app.iconResolvedAt).getTime() > NEGATIVE_ICON_CACHE_TTL_MS;
  }
}
