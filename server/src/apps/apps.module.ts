import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { AuthGuard } from '../common/guards/auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AppsController],
  providers: [AppsService, AuthGuard],
})
export class AppsModule {}
