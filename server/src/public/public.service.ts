import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    tags: parseTags(app.tags),
    openInNewTab: app.openInNewTab,
    hasFeatureIndex: app.features?.length > 0,
  };
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async config() {
    const rows = await this.prisma.setting.findMany();
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value || '';
      return acc;
    }, {});
  }

  async apps() {
    const categories = await this.prisma.category.findMany({
      where: { visible: true },
      include: {
        apps: {
          where: { visible: true },
          include: { features: { orderBy: { sortOrder: 'asc' } } },
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
        apps: category.apps.map(serializeApp),
      }))
      .filter((category) => category.apps.length > 0);

    const uncategorized = await this.prisma.app.findMany({
      where: { visible: true, categoryId: null },
      include: { features: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

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

  async appDetail(id: number) {
    const app = await this.prisma.app.findFirst({
      where: { id, visible: true },
      include: {
        category: true,
        features: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });

    if (!app) {
      throw new NotFoundException('系统不存在');
    }

    return {
      ...serializeApp(app),
      category: app.category
        ? {
            id: app.category.id,
            name: app.category.name,
            icon: app.category.icon,
          }
        : null,
      features: app.features.map((feature) => ({
        id: feature.id,
        title: feature.title,
        description: feature.description,
        anchor: feature.anchor,
      })),
    };
  }
}
