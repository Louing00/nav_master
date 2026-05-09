import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = request.cookies?.atlasgate_token;

    if (!token) {
      throw new UnauthorizedException('请先登录');
    }

    try {
      request.user = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'please-change-this-secret',
      });
      return true;
    } catch {
      throw new UnauthorizedException('登录已失效');
    }
  }
}
