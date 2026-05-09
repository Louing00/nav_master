import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsObject } from 'class-validator';
import { AuthGuard } from '../common/guards/auth.guard';
import { ImportExportService } from './import-export.service';

class ImportDto {
  @IsIn(['merge', 'replace'])
  mode: 'merge' | 'replace';

  @IsObject()
  data: Record<string, unknown>;
}

@UseGuards(AuthGuard)
@Controller('admin')
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

  @Get('export')
  export() {
    return this.importExportService.export();
  }

  @Post('import')
  import(@Body() dto: ImportDto) {
    return this.importExportService.import(dto.mode, dto.data);
  }
}
