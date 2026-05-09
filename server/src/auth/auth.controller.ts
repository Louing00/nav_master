import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const user = await this.authService.validateLogin(dto.username, dto.password, request.ip);
    const token = await this.authService.sign(user);

    response.cookie('atlasgate_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { success: true, message: '登录成功' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('atlasgate_token', { path: '/' });
    return { success: true };
  }

  @Get('me')
  async me(@Req() request: Request) {
    const token = request.cookies?.atlasgate_token;
    if (!token) {
      throw new UnauthorizedException('请先登录');
    }

    return this.authService.me(token);
  }
}
