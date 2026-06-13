import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { App } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ProbeResult = {
  healthStatus: 'healthy' | 'restricted' | 'unhealthy';
  healthLatencyMs: number;
  healthError: string | null;
};

const TIMEOUT_MS = 5000;
const ACCESS_RESTRICTED_STATUSES = new Set([401, 403, 407, 429, 451]);
const RETRY_WITH_GET_STATUSES = new Set([401, 403, 405, 407, 429, 451, 501]);
const BROWSER_LIKE_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

export function classifyHealthStatus(status: number, latencyMs: number): ProbeResult {
  if (status >= 200 && status < 400) {
    return {
      healthStatus: 'healthy',
      healthLatencyMs: latencyMs,
      healthError: null,
    };
  }

  if (ACCESS_RESTRICTED_STATUSES.has(status)) {
    return {
      healthStatus: 'restricted',
      healthLatencyMs: latencyMs,
      healthError: `HTTP ${status}`,
    };
  }

  return {
    healthStatus: 'unhealthy',
    healthLatencyMs: latencyMs,
    healthError: `HTTP ${status}`,
  };
}

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

    return this.checkPersistedApp(app);
  }

  private async checkPersistedApp(app: App) {
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
      checked.push(await this.checkPersistedApp(app));
    }

    return checked;
  }

  private async probe(url: string): Promise<ProbeResult> {
    const startedAt = Date.now();

    try {
      const head = await this.request(url, 'HEAD');
      if (RETRY_WITH_GET_STATUSES.has(head.status)) {
        try {
          return this.statusFromResponse(await this.request(url, 'GET'), startedAt);
        } catch {
          return this.statusFromResponse(head, startedAt);
        }
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
    return classifyHealthStatus(response.status, Date.now() - startedAt);
  }

  private async request(url: string, method: 'HEAD' | 'GET') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      return await fetch(url, {
        headers: BROWSER_LIKE_HEADERS,
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
