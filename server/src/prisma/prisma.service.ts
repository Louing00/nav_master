import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const settings = {
  site_title: 'AtlasGate 星渡枢航',
  site_subtitle: '个人系统、内网服务与运维入口的统一星图',
  logo: '✦',
  theme: 'auto',
  footer_text: 'Powered by AtlasGate',
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    await this.ensureSchema();
    await this.seedDefaults();
  }

  private async ensureSchema() {
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "username" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "icon" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "visible" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "App" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "description" TEXT,
        "icon" TEXT,
        "categoryId" INTEGER,
        "tags" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "visible" BOOLEAN NOT NULL DEFAULT true,
        "openInNewTab" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "App_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await this.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "App_url_key" ON "App"("url");`);
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppFeature" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "appId" INTEGER NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "anchor" TEXT NOT NULL,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AppFeature_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Setting" (
        "key" TEXT NOT NULL PRIMARY KEY,
        "value" TEXT,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private async seedDefaults() {
    const userCount = await this.user.count();
    if (userCount === 0) {
      await this.user.create({
        data: {
          username: process.env.ADMIN_USERNAME || 'admin',
          passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'please-change-password', 12),
        },
      });
    }

    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        this.setting.upsert({
          where: { key },
          update: {},
          create: { key, value },
        }),
      ),
    );

    const categoryCount = await this.category.count();
    if (categoryCount > 0) {
      return;
    }

    const core = await this.category.create({
      data: {
        name: '核心系统',
        description: '日常使用频率最高的自研平台',
        icon: '◇',
        sortOrder: 1,
      },
    });

    const ops = await this.category.create({
      data: {
        name: '运维中枢',
        description: '服务器、任务、资源与控制台入口',
        icon: '⌘',
        sortOrder: 2,
      },
    });

    await this.app.create({
      data: {
        name: '邻渡',
        url: 'https://lindu.louing.site',
        description: '局域网文件传输与近场协作系统，面向快速投递、设备互传和临时共享。',
        icon: '⇆',
        categoryId: core.id,
        tags: JSON.stringify(['文件传输', '局域网', '共享']),
        sortOrder: 1,
        openInNewTab: true,
        features: {
          create: [
            {
              title: '快速投递',
              description: '通过浏览器把文件直接发送到同网段设备，适合临时分发和跨设备迁移。',
              anchor: 'quick-transfer',
              sortOrder: 1,
            },
            {
              title: '接收空间',
              description: '查看接收队列、下载历史和临时文件，保持传输过程可追踪。',
              anchor: 'inbox',
              sortOrder: 2,
            },
            {
              title: '共享链接',
              description: '生成短期可访问链接，用于把局域网文件分享给指定设备。',
              anchor: 'share-link',
              sortOrder: 3,
            },
          ],
        },
      },
    });

    await this.app.create({
      data: {
        name: '云枢控制台',
        url: 'https://yunshu.louing.site',
        description: '服务器管控平台，集中查看主机、服务、容器与部署任务状态。',
        icon: '⌁',
        categoryId: ops.id,
        tags: JSON.stringify(['服务器', '控制台', '运维']),
        sortOrder: 2,
        openInNewTab: true,
        features: {
          create: [
            {
              title: '主机概览',
              description: '聚合 CPU、内存、磁盘和网络状态，快速判断服务器健康度。',
              anchor: 'host-overview',
              sortOrder: 1,
            },
            {
              title: '服务编排',
              description: '管理常驻服务、容器和启动策略，减少重复登录服务器的操作。',
              anchor: 'service-orchestration',
              sortOrder: 2,
            },
            {
              title: '部署任务',
              description: '沉淀发布脚本、执行记录和回滚入口，适合个人项目持续迭代。',
              anchor: 'deployments',
              sortOrder: 3,
            },
          ],
        },
      },
    });
  }
}
