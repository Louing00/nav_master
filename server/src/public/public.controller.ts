import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('config')
  config() {
    return this.publicService.config();
  }

  @Get('apps')
  apps() {
    return this.publicService.apps();
  }

  @Get('apps/:id')
  appDetail(@Param('id', ParseIntPipe) id: number) {
    return this.publicService.appDetail(id);
  }
}
