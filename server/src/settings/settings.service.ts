import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMap(userId: number) {
    await this.prisma.ensureUserWorkspace(userId);
    const rows = await this.prisma.setting.findMany({ where: { userId } });
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value || '';
      return acc;
    }, {});
  }

  async update(userId: number, settings: Record<string, string>) {
    const entries = Object.entries(settings).filter(([key]) =>
      ['site_title', 'site_subtitle', 'logo', 'theme', 'footer_text', 'health_auto_check_enabled', 'health_auto_check_interval_minutes'].includes(key),
    );

    await Promise.all(
      entries.map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { userId_key: { userId, key } },
          update: { value: this.normalize(key, value) },
          create: { key, value: this.normalize(key, value), userId },
        }),
      ),
    );

    return this.getMap(userId);
  }

  private normalize(key: string, value: unknown) {
    if (key === 'health_auto_check_enabled') {
      return value === true || value === 'true' ? 'true' : 'false';
    }

    if (key === 'health_auto_check_interval_minutes') {
      const interval = Number(value || 30);
      if (!Number.isFinite(interval)) {
        return '30';
      }
      return String(Math.min(Math.max(Math.round(interval), 1), 1440));
    }

    return String(value ?? '');
  }
}
