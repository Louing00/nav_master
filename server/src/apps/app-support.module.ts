import { Module } from '@nestjs/common';
import { AppMetadataService } from './app-metadata.service';
import { HealthCheckService } from './health-check.service';
import { SiteMetadataService } from './site-metadata.service';

@Module({
  providers: [AppMetadataService, HealthCheckService, SiteMetadataService],
  exports: [AppMetadataService, HealthCheckService, SiteMetadataService],
})
export class AppSupportModule {}
