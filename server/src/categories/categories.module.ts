import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../common/guards/auth.guard';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [CategoriesController],
  providers: [CategoriesService, AuthGuard],
})
export class CategoriesModule {}
