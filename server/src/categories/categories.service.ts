import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({
      include: { _count: { select: { apps: true } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.app.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: number) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('分类不存在');
    }
  }
}
