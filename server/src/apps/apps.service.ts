import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppIconService } from './app-icon.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { HealthCheckService } from './health-check.service';

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
        { description: { contains: filters.keyword } },
        { tags: { contains: filters.keyword } },
      ];
    }

    const apps = await this.prisma.app.findMany({
      where,
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return apps.map(serialize);
  }

  async create(userId: number, dto: CreateAppDto) {
    await this.ensureCategoryBelongsToUser(userId, dto.categoryId);
    const iconCache = await this.resolveIconCache(dto.url);
    const app = await this.prisma.app.create({
      data: {
        ...dto,
        tags: JSON.stringify(dto.tags || []),
        userId,
        ...iconCache,
      },
      include: { category: true },
    });
    return serialize(app);
  }

  async update(userId: number, id: number, dto: UpdateAppDto) {
    const existing = await this.ensureExists(userId, id);
    await this.ensureCategoryBelongsToUser(userId, dto.categoryId);
    const urlChanged = dto.url !== undefined && dto.url !== existing.url;
    const shouldResolveIcon = urlChanged || !existing.iconResolvedAt;
    const iconCache = shouldResolveIcon ? await this.resolveIconCache(dto.url || existing.url) : {};
    const healthDisabled = dto.healthEnabled === false;
    const app = await this.prisma.app.update({
      where: { id },
      data: {
        ...dto,
        tags: dto.tags === undefined ? undefined : JSON.stringify(dto.tags),
        ...iconCache,
        healthStatus: healthDisabled || urlChanged ? 'unknown' : undefined,
        healthCheckedAt: healthDisabled || urlChanged ? null : undefined,
        healthLatencyMs: healthDisabled || urlChanged ? null : undefined,
        healthError: healthDisabled || urlChanged ? null : undefined,
      },
      include: { category: true },
    });
    return serialize(app);
  }

  async checkHealth(userId: number, id: number) {
    return serialize(await this.healthCheckService.checkApp(userId, id));
  }

  async checkAllHealth(userId: number) {
    const apps = await this.healthCheckService.checkAll(userId);
    return apps.map(serialize);
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
}
