import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../common/guards/auth.guard';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [SettingsController],
  providers: [SettingsService, AuthGuard],
  exports: [SettingsService],
})
export class SettingsModule {}
