import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { SettingsService } from './settings.service';

@UseGuards(AuthGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  list() {
    return this.settingsService.getMap();
  }

  @Put()
  update(@Body() body: any) {
    const settings = body?.settings && typeof body.settings === 'object' ? body.settings : body;
    return this.settingsService.update(settings);
  }
}
