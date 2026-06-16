import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { createReadStream } from 'fs';
import { Request, Response } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { PublicService } from './public.service';

type AuthRequest = Request & { user: { id: number; username: string } };

@UseGuards(AuthGuard)
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('config')
  config(@Req() request: AuthRequest) {
    return this.publicService.config(request.user.id);
  }

  @Get('apps')
  apps(@Req() request: AuthRequest) {
    return this.publicService.apps(request.user.id);
  }

  @Post('categories/:id/health-check')
  checkCategoryHealth(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.publicService.checkCategoryHealth(request.user.id, id);
  }

  @Post('categories/:id/reorder-apps')
  reorderApps(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body('appIds') appIds: number[]) {
    return this.publicService.reorderApps(request.user.id, id, appIds);
  }

  @Post('apps/:id/cache-browser-icon')
  cacheBrowserIcon(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body('resolvedIconUrl') resolvedIconUrl: string) {
    return this.publicService.cacheBrowserResolvedIcon(request.user.id, id, resolvedIconUrl);
  }

  @Get('app-icons/:file')
  async appIcon(@Param('file') file: string, @Res({ passthrough: true }) response: Response) {
    const icon = await this.publicService.getCachedIcon(file);
    if (!icon) {
      throw new NotFoundException('图标不存在');
    }

    response.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
      'Content-Type': icon.contentType,
      'X-Content-Type-Options': 'nosniff',
    });

    return new StreamableFile(createReadStream(icon.path));
  }
}
