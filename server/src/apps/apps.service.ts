import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';

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
    hasFeatureIndex: Array.isArray(app.features) ? app.features.length > 0 : undefined,
  };
}

@Injectable()
export class AppsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: { keyword?: string; categoryId?: number; visible?: boolean }) {
    const where: Prisma.AppWhereInput = {};
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters.visible !== undefined) {
      where.visible = filters.visible;
    }
    if (filters.keyword) {
      where.OR = [
        { name: { contains: filters.keyword } },
        { description: { contains: filters.keyword } },
        { tags: { contains: filters.keyword } },
      ];
    }

    const apps = await this.prisma.app.findMany({
      where,
      include: { category: true, features: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return apps.map(serialize);
  }

  async create(dto: CreateAppDto) {
    const app = await this.prisma.app.create({
      data: {
        ...dto,
        tags: JSON.stringify(dto.tags || []),
      },
      include: { category: true, features: true },
    });
    return serialize(app);
  }

  async update(id: number, dto: UpdateAppDto) {
    await this.ensureExists(id);
    const app = await this.prisma.app.update({
      where: { id },
      data: {
        ...dto,
        tags: dto.tags ? JSON.stringify(dto.tags) : undefined,
      },
      include: { category: true, features: true },
    });
    return serialize(app);
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.app.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: number) {
    const exists = await this.prisma.app.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('应用不存在');
    }
  }
}
