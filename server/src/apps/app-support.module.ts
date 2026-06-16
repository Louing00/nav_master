import { Module } from '@nestjs/common';
import { AppMetadataService } from './app-metadata.service';
import { HealthCheckService } from './health-check.service';
import { IconCacheService } from './icon-cache.service';
import { SiteMetadataService } from './site-metadata.service';

@Module({
  providers: [AppMetadataService, HealthCheckService, IconCacheService, SiteMetadataService],
  exports: [AppMetadataService, HealthCheckService, IconCacheService, SiteMetadataService],
})
export class AppSupportModule {}
