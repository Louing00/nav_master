import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMap() {
    const rows = await this.prisma.setting.findMany();
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value || '';
      return acc;
    }, {});
  }

  async update(settings: Record<string, string>) {
    const entries = Object.entries(settings).filter(([key]) =>
      ['site_title', 'site_subtitle', 'logo', 'theme', 'footer_text'].includes(key),
    );

    await Promise.all(
      entries.map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );

    return this.getMap();
  }
}
