import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizeSiteSetting,
  settingsRowsToMap,
  WRITABLE_SITE_SETTING_KEYS,
} from './site-settings';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMap(userId: number) {
    await this.prisma.ensureUserWorkspace(userId);
    const rows = await this.prisma.setting.findMany({ where: { userId } });
    return settingsRowsToMap(rows);
  }

  async update(userId: number, settings: Record<string, unknown>) {
    const entries = Object.entries(settings).filter(([key]) => WRITABLE_SITE_SETTING_KEYS.has(key));

    await Promise.all(
      entries.map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { userId_key: { userId, key } },
          update: { value: normalizeSiteSetting(key, value) },
          create: { key, value: normalizeSiteSetting(key, value), userId },
        }),
      ),
    );

    return this.getMap(userId);
  }
}
