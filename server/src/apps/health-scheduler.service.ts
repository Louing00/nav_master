import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  HEALTH_AUTO_CHECK_LAST_AT_KEY,
  parseHealthIntervalMinutes,
  settingEnabled,
  settingsRowsToMap,
} from '../settings/site-settings';
import { HealthCheckService } from './health-check.service';

const ENABLED_KEY = 'health_auto_check_enabled';
const INTERVAL_KEY = 'health_auto_check_interval_minutes';

@Injectable()
export class HealthSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthSchedulerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private startupTimer?: ReturnType<typeof setTimeout>;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.runDueChecks(), 60_000);
    this.startupTimer = setTimeout(() => void this.runDueChecks(), 15_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
    }
  }

  private async runDueChecks() {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      for (const user of users) {
        try {
          await this.runUserDueCheck(user.id);
        } catch (error) {
          this.logger.warn(`用户 ${user.id} 自动健康检查失败：${this.formatError(error)}`);
        }
      }
    } catch (error) {
      this.logger.warn(`自动健康检查调度失败：${this.formatError(error)}`);
    } finally {
      this.running = false;
    }
  }

  private async runUserDueCheck(userId: number) {
    const rows = await this.prisma.setting.findMany({
      where: { userId, key: { in: [ENABLED_KEY, INTERVAL_KEY, HEALTH_AUTO_CHECK_LAST_AT_KEY] } },
    });
    const settings = settingsRowsToMap(rows);

    if (!settingEnabled(settings[ENABLED_KEY], true)) {
      return;
    }

    const intervalMs = parseHealthIntervalMinutes(settings[INTERVAL_KEY]) * 60_000;
    const lastCheckedAt = Date.parse(settings[HEALTH_AUTO_CHECK_LAST_AT_KEY] || '');
    if (Number.isFinite(lastCheckedAt) && Date.now() - lastCheckedAt < intervalMs) {
      return;
    }

    const checkedApps = await this.healthCheckService.checkAll(userId);
    const checkedAt = new Date().toISOString();
    await this.prisma.setting.upsert({
      where: { userId_key: { userId, key: HEALTH_AUTO_CHECK_LAST_AT_KEY } },
      update: { value: checkedAt },
      create: { userId, key: HEALTH_AUTO_CHECK_LAST_AT_KEY, value: checkedAt },
    });

    if (checkedApps.length > 0) {
      this.logger.log(`用户 ${userId} 自动健康检查完成：${checkedApps.length} 个应用`);
    }
  }

  private formatError(error: unknown) {
    return error instanceof Error ? error.message : '未知错误';
  }
}
