import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { PreviewAppDto } from './dto/preview-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';

type AuthRequest = Request & { user: { id: number; username: string } };

@UseGuards(AuthGuard)
@Controller('admin/apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  list(@Req() request: AuthRequest, @Query('keyword') keyword?: string, @Query('categoryId') categoryId?: string, @Query('visible') visible?: string) {
    return this.appsService.list(request.user.id, {
      keyword,
      categoryId: categoryId ? Number(categoryId) : undefined,
      visible: visible === undefined ? undefined : visible === 'true',
    });
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() dto: CreateAppDto) {
    return this.appsService.create(request.user.id, dto);
  }

  @Post('preview')
  preview(@Body() dto: PreviewAppDto) {
    return this.appsService.preview(dto.url);
  }

  @Post('health-check')
  checkAllHealth(@Req() request: AuthRequest) {
    return this.appsService.checkAllHealth(request.user.id);
  }

  @Post(':id/health-check')
  checkHealth(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.appsService.checkHealth(request.user.id, id);
  }

  @Post(':id/refresh-icon')
  refreshIcon(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.appsService.refreshIcon(request.user.id, id);
  }

  @Post(':id/cache-browser-icon')
  cacheBrowserIcon(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body('resolvedIconUrl') resolvedIconUrl: string) {
    return this.appsService.cacheBrowserResolvedIcon(request.user.id, id, resolvedIconUrl);
  }

  @Put(':id')
  update(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAppDto) {
    return this.appsService.update(request.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.appsService.remove(request.user.id, id);
  }
}
