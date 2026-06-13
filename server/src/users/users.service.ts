import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type UserWithCounts = Prisma.UserGetPayload<{
  include: { _count: { select: { apps: true; categories: true } } };
}>;

function serializeUser(user: UserWithCounts) {
  return {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    appCount: user._count.apps,
    categoryCount: user._count.categories,
  };
}

function validateUsername(username: string) {
  const normalized = username.trim();
  if (!/^[A-Za-z0-9_@.-]{3,32}$/.test(normalized)) {
    throw new BadRequestException('用户名需为 3-32 位字母、数字或 _@.-');
  }
  return normalized;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      include: { _count: { select: { apps: true, categories: true } } },
      orderBy: [{ isAdmin: 'desc' }, { id: 'asc' }],
    });
    return users.map(serializeUser);
  }

  async create(dto: CreateUserDto) {
    const username = validateUsername(dto.username);
    const exists = await this.prisma.user.findUnique({ where: { username } });
    if (exists) {
      throw new ConflictException('用户名已存在');
    }

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(dto.password, 12),
        isAdmin: dto.isAdmin ?? false,
      },
    });
    await this.prisma.ensureUserWorkspace(user.id);
    const saved = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { _count: { select: { apps: true, categories: true } } },
    });
    return serializeUser(saved);
  }

  async update(currentUserId: number, id: number, dto: UpdateUserDto) {
    const user = await this.ensureExists(id);
    const data: { isAdmin?: boolean; passwordHash?: string } = {};

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    if (dto.isAdmin !== undefined) {
      if (id === currentUserId && user.isAdmin && dto.isAdmin === false) {
        throw new BadRequestException('不能取消自己的管理员权限');
      }
      if (user.isAdmin && dto.isAdmin === false) {
        await this.ensureAnotherAdmin(id);
      }
      data.isAdmin = dto.isAdmin;
    }

    const saved = await this.prisma.user.update({
      where: { id },
      data,
      include: { _count: { select: { apps: true, categories: true } } },
    });
    return serializeUser(saved);
  }

  async remove(currentUserId: number, id: number) {
    const user = await this.ensureExists(id);
    if (id === currentUserId) {
      throw new BadRequestException('不能删除当前登录用户');
    }
    if (user.isAdmin) {
      await this.ensureAnotherAdmin(id);
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  private async ensureAnotherAdmin(excludedUserId: number) {
    const count = await this.prisma.user.count({ where: { isAdmin: true, id: { not: excludedUserId } } });
    if (count === 0) {
      throw new BadRequestException('至少需要保留一个管理员');
    }
  }
}
