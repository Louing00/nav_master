import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../common/guards/auth.guard';
import { ImportExportController } from './import-export.controller';
import { ImportExportService } from './import-export.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ImportExportController],
  providers: [ImportExportService, AuthGuard],
})
export class ImportExportModule {}
