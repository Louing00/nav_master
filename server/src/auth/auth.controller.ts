import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';

type AuthRequest = Request & { user: { id: number; username: string } };

class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class RegisterDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
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

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.authService.register(dto.username, dto.password);
    const token = await this.authService.sign(user);

    response.cookie('atlasgate_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { success: true, message: '注册成功' };
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

  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() request: AuthRequest,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.changePassword(request.user.id, dto.currentPassword, dto.newPassword);
    response.clearCookie('atlasgate_token', { path: '/' });
    return { success: true, message: '密码已修改，请重新登录' };
  }
}
