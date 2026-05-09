import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsIn, IsObject } from 'class-validator';
import { AuthGuard } from '../common/guards/auth.guard';
import { ImportExportService } from './import-export.service';

type AuthRequest = Request & { user: { id: number; username: string } };

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
  export(@Req() request: AuthRequest) {
    return this.importExportService.export(request.user.id);
  }

  @Post('import')
  import(@Req() request: AuthRequest, @Body() dto: ImportDto) {
    return this.importExportService.import(request.user.id, dto.mode, dto.data);
  }
}
