import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { SettingsService } from './settings.service';

type AuthRequest = Request & { user: { id: number; username: string } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

@UseGuards(AuthGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  list(@Req() request: AuthRequest) {
    return this.settingsService.getMap(request.user.id);
  }

  @Put()
  update(@Req() request: AuthRequest, @Body() body: unknown) {
    const settings = isRecord(body) && isRecord(body.settings) ? body.settings : isRecord(body) ? body : {};
    return this.settingsService.update(request.user.id, settings);
  }
}
