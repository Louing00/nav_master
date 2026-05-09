import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: number) {
    return this.prisma.category.findMany({
      where: { userId },
      include: { _count: { select: { apps: true } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  create(userId: number, dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { ...dto, userId } });
  }

  async update(userId: number, id: number, dto: UpdateCategoryDto) {
    await this.ensureExists(userId, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(userId: number, id: number) {
    await this.ensureExists(userId, id);
    await this.prisma.app.updateMany({ where: { categoryId: id, userId }, data: { categoryId: null } });
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(userId: number, id: number) {
    const exists = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!exists) {
      throw new NotFoundException('分类不存在');
    }
  }
}
