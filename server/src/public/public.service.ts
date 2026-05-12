import { Injectable } from '@nestjs/common';
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
  };
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

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
}
