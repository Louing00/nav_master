import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type AuthRequest = Request & { user: { id: number; username: string } };

@UseGuards(AuthGuard)
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list(@Req() request: AuthRequest) {
    return this.categoriesService.list(request.user.id);
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(request.user.id, dto);
  }

  @Put(':id')
  update(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(request.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(request.user.id, id);
  }
}
