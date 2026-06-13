import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { serializeApp } from './app-record';
import { AppMetadataService } from './app-metadata.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { HealthCheckService } from './health-check.service';
import { normalizeManualName } from './app-name.util';

@Injectable()
export class AppsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appMetadataService: AppMetadataService,
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
        { resolvedDescription: { contains: filters.keyword } },
        { tags: { contains: filters.keyword } },
      ];
    }

    const apps = await this.prisma.app.findMany({
      where,
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    this.appMetadataService.queueMissing(userId, apps, true);
    return apps.map(serializeApp);
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
    this.appMetadataService.queueForAppChange(userId, app.id, app.url);
    return serializeApp(app);
  }

  async preview(url: string) {
    return this.appMetadataService.preview(url);
  }

  async update(userId: number, id: number, dto: UpdateAppDto) {
    const existing = await this.ensureExists(userId, id);
    await this.ensureCategoryBelongsToUser(userId, dto.categoryId);
    const urlChanged = dto.url !== undefined && dto.url !== existing.url;
    const targetUrl = dto.url || existing.url;
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
        resolvedDescription: urlChanged ? null : undefined,
        descriptionResolvedAt: urlChanged ? null : undefined,
        resolvedIconUrl: urlChanged ? null : undefined,
        iconResolvedAt: urlChanged ? null : undefined,
        healthStatus: healthDisabled || urlChanged ? 'unknown' : undefined,
        healthCheckedAt: healthDisabled || urlChanged ? null : undefined,
        healthLatencyMs: healthDisabled || urlChanged ? null : undefined,
        healthError: healthDisabled || urlChanged ? null : undefined,
      },
      include: { category: true },
    });
    this.appMetadataService.queueForAppChange(userId, app.id, targetUrl);
    return serializeApp(app);
  }

  async checkHealth(userId: number, id: number) {
    return serializeApp(await this.healthCheckService.checkApp(userId, id));
  }

  async checkAllHealth(userId: number) {
    const apps = await this.healthCheckService.checkAll(userId);
    return apps.map(serializeApp);
  }

  async refreshIcon(userId: number, id: number) {
    return serializeApp(await this.appMetadataService.refreshIcon(userId, id));
  }

  async cacheBrowserResolvedIcon(userId: number, id: number, resolvedIconUrl: string) {
    return serializeApp(
      await this.appMetadataService.cacheBrowserResolvedIcon(userId, id, resolvedIconUrl),
    );
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

}
