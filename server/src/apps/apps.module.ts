import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { HealthCheckService } from './health-check.service';
import { HealthSchedulerService } from './health-scheduler.service';
import { AuthGuard } from '../common/guards/auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AppsController],
  providers: [AppsService, HealthCheckService, HealthSchedulerService, AuthGuard],
})
export class AppsModule {}
