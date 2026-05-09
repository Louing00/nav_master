import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PublicModule } from './public/public.module';
import { AppsModule } from './apps/apps.module';
import { CategoriesModule } from './categories/categories.module';
import { SettingsModule } from './settings/settings.module';
import { ImportExportModule } from './import-export/import-export.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'static', 'dist'),
      exclude: ['/api/(.*)'],
    }),
    PrismaModule,
    AuthModule,
    PublicModule,
    AppsModule,
    CategoriesModule,
    SettingsModule,
    ImportExportModule,
  ],
})
export class AppModule {}
