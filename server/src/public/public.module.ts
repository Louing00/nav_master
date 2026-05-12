import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HealthCheckService } from '../apps/health-check.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [PublicController],
  providers: [PublicService, HealthCheckService, AuthGuard],
})
export class PublicModule {}
