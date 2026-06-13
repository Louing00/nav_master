import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppSupportModule } from '../apps/app-support.module';
import { AuthGuard } from '../common/guards/auth.guard';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [JwtModule.register({}), AppSupportModule],
  controllers: [PublicController],
  providers: [PublicService, AuthGuard],
})
export class PublicModule {}
