import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
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
}
