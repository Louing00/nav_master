import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AppMetadataService } from '../apps/app-metadata.service';
import { serializePublicApp } from '../apps/app-record';
import { HealthCheckService } from '../apps/health-check.service';
import { IconCacheService } from '../apps/icon-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { settingEnabled, settingsRowsToMap } from '../settings/site-settings';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appMetadataService: AppMetadataService,
    private readonly healthCheckService: HealthCheckService,
    private readonly iconCache: IconCacheService,
  ) {}

  async config(userId: number) {
    await this.prisma.ensureUserWorkspace(userId);
    const rows = await this.prisma.setting.findMany({ where: { userId } });
    return settingsRowsToMap(rows);
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
    const grouped = categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        apps: category.apps.map(serializePublicApp),
      }))
      .filter((category) => category.apps.length > 0);
    const visibleApps = categories.flatMap((category) => category.apps);

    const uncategorized = await this.prisma.app.findMany({
      where: { visible: true, categoryId: null, userId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    if (uncategorized.length) {
      visibleApps.push(...uncategorized);
      grouped.push({
        id: 0,
        name: '未分类',
        description: '尚未归类的系统入口',
        icon: '·',
        apps: uncategorized.map(serializePublicApp),
      });
    }

    this.appMetadataService.queueMissing(userId, visibleApps, false);
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

    return checked.map(serializePublicApp);
  }

  async reorderApps(userId: number, categoryId: number, appIds: number[]) {
    await this.prisma.ensureUserWorkspace(userId);
    const settings = await this.config(userId);
    if (!settingEnabled(settings.home_quick_sort_enabled)) {
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
    await this.appMetadataService.cacheBrowserResolvedIcon(userId, id, resolvedIconUrl, {
      requireAutoResolveEnabled: true,
      publicRequest: true,
    });
    return { success: true };
  }

  getCachedIcon(file: string) {
    return this.iconCache.getCachedIcon(file);
  }
}
