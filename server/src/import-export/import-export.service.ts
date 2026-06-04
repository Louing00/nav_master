import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ImportCategory = {
  id?: number;
  name?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  visible?: boolean;
};

type ImportApp = {
  name?: string;
  resolvedName?: string | null;
  nameResolvedAt?: string | Date | null;
  url?: string;
  description?: string | null;
  icon?: string | null;
  iconUrl?: string | null;
  categoryId?: number | null;
  categoryName?: string;
  tags?: string[] | string | null;
  sortOrder?: number;
  visible?: boolean;
  openInNewTab?: boolean;
  healthEnabled?: boolean;
  features?: Array<{ title?: string; description?: string | null; anchor?: string; sortOrder?: number }>;
};

function parseTags(tags: unknown): string {
  if (Array.isArray(tags)) {
    return JSON.stringify(tags.map(String));
  }
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return JSON.stringify(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      return JSON.stringify(
        tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }
  }
  return JSON.stringify([]);
}

function parseDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

@Injectable()
export class ImportExportService {
  constructor(private readonly prisma: PrismaService) {}

  async export(userId: number) {
    const [settings, categories, apps] = await Promise.all([
      this.prisma.setting.findMany({ where: { userId } }),
      this.prisma.category.findMany({ where: { userId }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
      this.prisma.app.findMany({
        where: { userId },
        include: { category: true, features: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      version: '1.0.0',
      project: 'AtlasGate 星渡枢航',
      exportedAt: new Date().toISOString(),
      settings: settings.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = item.value || '';
        return acc;
      }, {}),
      categories: categories.map(({ userId: _userId, ...category }) => category),
      apps: apps.map((app) => {
        const { userId: _userId, category, resolvedIconUrl: _resolvedIconUrl, iconResolvedAt: _iconResolvedAt, ...payload } = app;
        const cleanCategory = category
          ? {
              id: category.id,
              name: category.name,
              description: category.description,
              icon: category.icon,
              sortOrder: category.sortOrder,
              visible: category.visible,
              createdAt: category.createdAt,
              updatedAt: category.updatedAt,
            }
          : null;

        return {
          ...payload,
          category: cleanCategory,
          categoryName: category?.name,
          tags: parseTags(app.tags) ? JSON.parse(parseTags(app.tags)) : [],
        };
      }),
    };
  }

  async import(userId: number, mode: 'merge' | 'replace', data: Record<string, unknown>) {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('导入数据格式不正确');
    }

    const settings = (data.settings || {}) as Record<string, string>;
    const categories = Array.isArray(data.categories) ? (data.categories as ImportCategory[]) : [];
    const apps = Array.isArray(data.apps) ? (data.apps as ImportApp[]) : [];

    if (mode === 'replace') {
      await this.prisma.appFeature.deleteMany({ where: { app: { userId } } });
      await this.prisma.app.deleteMany({ where: { userId } });
      await this.prisma.category.deleteMany({ where: { userId } });
    }

    for (const [key, value] of Object.entries(settings)) {
      await this.prisma.setting.upsert({
        where: { userId_key: { userId, key } },
        update: { value: String(value) },
        create: { key, value: String(value), userId },
      });
    }

    const categoryNameToId = new Map<string, number>();
    const categoryIdToId = new Map<number, number>();
    for (const category of categories) {
      if (!category.name) {
        continue;
      }
      const existing = category.id ? await this.prisma.category.findFirst({ where: { id: category.id, userId } }) : null;
      const payload = {
        name: category.name,
        description: category.description,
        icon: category.icon,
        sortOrder: category.sortOrder || 0,
        visible: category.visible ?? true,
      };
      const saved = existing
        ? await this.prisma.category.update({ where: { id: existing.id }, data: payload })
        : await this.prisma.category.create({ data: { ...payload, userId } });
      categoryNameToId.set(saved.name, saved.id);
      if (category.id) {
        categoryIdToId.set(category.id, saved.id);
      }
    }

    for (const app of apps) {
      if (!app.url || !/^https?:\/\//.test(app.url)) {
        continue;
      }

      const categoryId = app.categoryName ? categoryNameToId.get(app.categoryName) : app.categoryId ? categoryIdToId.get(app.categoryId) : undefined;
      const name = app.name?.trim() || '';
      const resolvedName = app.resolvedName?.trim() || null;
      const nameResolvedAt = parseDate(app.nameResolvedAt);
      const saved = await this.prisma.app.upsert({
        where: { userId_url: { userId, url: app.url } },
        update: {
          name,
          resolvedName,
          nameResolvedAt,
          description: app.description,
          icon: app.icon,
          iconUrl: app.iconUrl,
          categoryId: categoryId || null,
          tags: parseTags(app.tags),
          sortOrder: app.sortOrder || 0,
          visible: app.visible ?? true,
          openInNewTab: app.openInNewTab ?? true,
          healthEnabled: app.healthEnabled ?? true,
        },
        create: {
          name,
          resolvedName,
          nameResolvedAt,
          url: app.url,
          description: app.description,
          icon: app.icon,
          iconUrl: app.iconUrl,
          categoryId: categoryId || null,
          tags: parseTags(app.tags),
          sortOrder: app.sortOrder || 0,
          visible: app.visible ?? true,
          openInNewTab: app.openInNewTab ?? true,
          healthEnabled: app.healthEnabled ?? true,
          userId,
        },
      });

      if (Array.isArray(app.features)) {
        await this.prisma.appFeature.deleteMany({ where: { appId: saved.id } });
        await this.prisma.appFeature.createMany({
          data: app.features
            .filter((feature) => feature.title && feature.anchor)
            .map((feature, index) => ({
              appId: saved.id,
              title: String(feature.title),
              description: feature.description || null,
              anchor: String(feature.anchor),
              sortOrder: feature.sortOrder ?? index + 1,
            })),
        });
      }
    }

    return { success: true };
  }
}
