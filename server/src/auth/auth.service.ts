import { Injectable, UnauthorizedException } from '@nestjs/common';
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

    this.attempts.delete(key);
    return { id: user.id, username: user.username };
  }

  async sign(user: { id: number; username: string }) {
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
      return { id: payload.id, username: payload.username };
    } catch {
      throw new UnauthorizedException('登录已失效');
    }
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
