import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

type LoginBucket = {
  count: number;
  firstAttemptAt: number;
};

@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, LoginBucket>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateLogin(username: string, password: string, ip?: string) {
    const key = `${ip || 'unknown'}:${username}`;
    this.assertNotLimited(key);

    const user = await this.prisma.user.findUnique({ where: { username } });
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!ok || !user) {
      this.recordFailure(key);
      throw new UnauthorizedException('用户名或密码错误');
    }

    await this.prisma.ensureUserWorkspace(user.id);
    this.attempts.delete(key);
    return { id: user.id, username: user.username, isAdmin: user.isAdmin };
  }

  async register(username: string, password: string) {
    const normalized = username.trim();
    if (!/^[A-Za-z0-9_@.-]{3,32}$/.test(normalized)) {
      throw new BadRequestException('用户名需为 3-32 位字母、数字或 _@.-');
    }

    const exists = await this.prisma.user.findUnique({ where: { username: normalized } });
    if (exists) {
      throw new ConflictException('用户名已存在');
    }

    const user = await this.prisma.user.create({
      data: {
        username: normalized,
        passwordHash: await bcrypt.hash(password, 12),
        isAdmin: false,
      },
    });
    await this.prisma.ensureUserWorkspace(user.id);
    return { id: user.id, username: user.username, isAdmin: user.isAdmin };
  }

  async sign(user: { id: number; username: string; isAdmin?: boolean }) {
    return this.jwtService.signAsync(user, {
      secret: process.env.JWT_SECRET || 'please-change-this-secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  }

  async me(token: string) {
    try {
      const payload = this.jwtService.verify<{ id: number; username: string }>(token, {
        secret: process.env.JWT_SECRET || 'please-change-this-secret',
      });
      await this.prisma.ensureUserWorkspace(payload.id);
      const user = await this.prisma.user.findUnique({ where: { id: payload.id } });
      if (!user) {
        throw new UnauthorizedException('登录已失效');
      }
      return { id: user.id, username: user.username, isAdmin: user.isAdmin };
    } catch {
      throw new UnauthorizedException('登录已失效');
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    if (currentPassword === newPassword) {
      throw new UnauthorizedException('新密码不能与旧密码相同');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const ok = user ? await bcrypt.compare(currentPassword, user.passwordHash) : false;
    if (!ok || !user) {
      throw new UnauthorizedException('当前密码不正确');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
      },
    });

    return { success: true };
  }

  private assertNotLimited(key: string) {
    const bucket = this.attempts.get(key);
    if (!bucket) {
      return;
    }

    const windowMs = 10 * 60 * 1000;
    if (Date.now() - bucket.firstAttemptAt > windowMs) {
      this.attempts.delete(key);
      return;
    }

    if (bucket.count >= 8) {
      throw new UnauthorizedException('登录尝试过多，请稍后再试');
    }
  }

  private recordFailure(key: string) {
    const bucket = this.attempts.get(key);
    if (!bucket) {
      this.attempts.set(key, { count: 1, firstAttemptAt: Date.now() });
      return;
    }

    bucket.count += 1;
  }
}
