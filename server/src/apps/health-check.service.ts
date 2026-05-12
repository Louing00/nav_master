import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { App } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ProbeResult = {
  healthStatus: 'healthy' | 'unhealthy';
  healthLatencyMs: number;
  healthError: string | null;
};

const TIMEOUT_MS = 5000;

@Injectable()
export class HealthCheckService {
  constructor(private readonly prisma: PrismaService) {}

  async checkApp(userId: number, id: number) {
    const app = await this.prisma.app.findFirst({ where: { id, userId } });
    if (!app) {
      throw new NotFoundException('应用不存在');
    }
    if (!app.healthEnabled) {
      throw new BadRequestException('该应用未启用健康检查');
    }

    const result = await this.probe(app.url);
    return this.prisma.app.update({
      where: { id: app.id },
      data: {
        healthStatus: result.healthStatus,
        healthCheckedAt: new Date(),
        healthLatencyMs: result.healthLatencyMs,
        healthError: result.healthError,
      },
    });
  }

  async checkAll(userId: number) {
    const apps = await this.prisma.app.findMany({
      where: { userId, healthEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const checked: App[] = [];

    for (const app of apps) {
      checked.push(await this.checkApp(userId, app.id));
    }

    return checked;
  }

  private async probe(url: string): Promise<ProbeResult> {
    const startedAt = Date.now();

    try {
      const head = await this.request(url, 'HEAD');
      if (head.status === 405 || head.status === 501) {
        return this.statusFromResponse(await this.request(url, 'GET'), startedAt);
      }

      return this.statusFromResponse(head, startedAt);
    } catch (headError) {
      try {
        return this.statusFromResponse(await this.request(url, 'GET'), startedAt);
      } catch (getError) {
        return {
          healthStatus: 'unhealthy',
          healthLatencyMs: Date.now() - startedAt,
          healthError: this.formatError(getError || headError),
        };
      }
    }
  }

  private statusFromResponse(response: Response, startedAt: number): ProbeResult {
    const latency = Date.now() - startedAt;
    if (response.status >= 200 && response.status < 400) {
      return {
        healthStatus: 'healthy',
        healthLatencyMs: latency,
        healthError: null,
      };
    }

    return {
      healthStatus: 'unhealthy',
      healthLatencyMs: latency,
      healthError: `HTTP ${response.status}`,
    };
  }

  private async request(url: string, method: 'HEAD' | 'GET') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      return await fetch(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private formatError(error: unknown) {
    if (error instanceof Error) {
      return error.name === 'AbortError' ? '请求超时' : error.message.slice(0, 160);
    }
    return '请求失败';
  }
}
