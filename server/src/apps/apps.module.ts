import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { AppSupportModule } from './app-support.module';
import { HealthSchedulerService } from './health-scheduler.service';
import { AuthGuard } from '../common/guards/auth.guard';

@Module({
  imports: [JwtModule.register({}), AppSupportModule],
  controllers: [AppsController],
  providers: [AppsService, HealthSchedulerService, AuthGuard],
})
export class AppsModule {}
