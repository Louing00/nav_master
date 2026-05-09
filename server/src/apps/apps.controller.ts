import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';

@UseGuards(AuthGuard)
@Controller('admin/apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  list(@Query('keyword') keyword?: string, @Query('categoryId') categoryId?: string, @Query('visible') visible?: string) {
    return this.appsService.list({
      keyword,
      categoryId: categoryId ? Number(categoryId) : undefined,
      visible: visible === undefined ? undefined : visible === 'true',
    });
  }

  @Post()
  create(@Body() dto: CreateAppDto) {
    return this.appsService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAppDto) {
    return this.appsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.appsService.remove(id);
  }
}
