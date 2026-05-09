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
  url?: string;
  description?: string | null;
  icon?: string | null;
  categoryId?: number | null;
  categoryName?: string;
  tags?: string[] | string | null;
  sortOrder?: number;
  visible?: boolean;
  openInNewTab?: boolean;
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

@Injectable()
export class ImportExportService {
  constructor(private readonly prisma: PrismaService) {}

  async export() {
    const [settings, categories, apps] = await Promise.all([
      this.prisma.setting.findMany(),
      this.prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
      this.prisma.app.findMany({
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
      categories,
      apps: apps.map((app) => ({
        ...app,
        categoryName: app.category?.name,
        tags: parseTags(app.tags) ? JSON.parse(parseTags(app.tags)) : [],
      })),
    };
  }

  async import(mode: 'merge' | 'replace', data: Record<string, unknown>) {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('导入数据格式不正确');
    }

    const settings = (data.settings || {}) as Record<string, string>;
    const categories = Array.isArray(data.categories) ? (data.categories as ImportCategory[]) : [];
    const apps = Array.isArray(data.apps) ? (data.apps as ImportApp[]) : [];

    if (mode === 'replace') {
      await this.prisma.appFeature.deleteMany();
      await this.prisma.app.deleteMany();
      await this.prisma.category.deleteMany();
    }

    for (const [key, value] of Object.entries(settings)) {
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    const categoryNameToId = new Map<string, number>();
    for (const category of categories) {
      if (!category.name) {
        continue;
      }
      const saved = await this.prisma.category.upsert({
        where: { id: category.id || -1 },
        update: {
          name: category.name,
          description: category.description,
          icon: category.icon,
          sortOrder: category.sortOrder || 0,
          visible: category.visible ?? true,
        },
        create: {
          name: category.name,
          description: category.description,
          icon: category.icon,
          sortOrder: category.sortOrder || 0,
          visible: category.visible ?? true,
        },
      });
      categoryNameToId.set(saved.name, saved.id);
    }

    for (const app of apps) {
      if (!app.name || !app.url || !/^https?:\/\//.test(app.url)) {
        continue;
      }

      const categoryId = app.categoryName ? categoryNameToId.get(app.categoryName) : app.categoryId;
      const saved = await this.prisma.app.upsert({
        where: { url: app.url },
        update: {
          name: app.name,
          description: app.description,
          icon: app.icon,
          categoryId: categoryId || null,
          tags: parseTags(app.tags),
          sortOrder: app.sortOrder || 0,
          visible: app.visible ?? true,
          openInNewTab: app.openInNewTab ?? true,
        },
        create: {
          name: app.name,
          url: app.url,
          description: app.description,
          icon: app.icon,
          categoryId: categoryId || null,
          tags: parseTags(app.tags),
          sortOrder: app.sortOrder || 0,
          visible: app.visible ?? true,
          openInNewTab: app.openInNewTab ?? true,
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
