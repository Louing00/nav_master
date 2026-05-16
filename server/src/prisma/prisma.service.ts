import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const settings = {
  site_title: 'AtlasGate 星渡枢航',
  site_subtitle: '个人系统、内网服务与运维入口的统一星图',
  logo: '✦',
  theme: 'auto',
  footer_text: 'Powered by AtlasGate',
  home_quick_sort_enabled: 'false',
  health_auto_check_enabled: 'true',
  health_auto_check_interval_minutes: '30',
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    await this.ensureSchema();
    const owner = await this.ensureDefaultUser();
    await this.ensureAdminUser(owner.id);
    await this.assignExistingData(owner.id);
    await this.ensureUserWorkspace(owner.id);
  }

  private async ensureSchema() {
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "username" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "isAdmin" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await this.ensureColumn('User', 'isAdmin', '"isAdmin" BOOLEAN NOT NULL DEFAULT false');
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "icon" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "visible" BOOLEAN NOT NULL DEFAULT true,
        "userId" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "App" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "description" TEXT,
        "icon" TEXT,
        "resolvedIconUrl" TEXT,
        "iconResolvedAt" DATETIME,
        "categoryId" INTEGER,
        "tags" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "visible" BOOLEAN NOT NULL DEFAULT true,
        "openInNewTab" BOOLEAN NOT NULL DEFAULT true,
        "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
        "healthCheckedAt" DATETIME,
        "healthLatencyMs" INTEGER,
        "healthError" TEXT,
        "healthEnabled" BOOLEAN NOT NULL DEFAULT true,
        "userId" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "App_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "App_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await this.ensureColumn('Category', 'userId', '"userId" INTEGER');
    await this.ensureColumn('App', 'userId', '"userId" INTEGER');
    await this.ensureColumn('App', 'resolvedIconUrl', '"resolvedIconUrl" TEXT');
    await this.ensureColumn('App', 'iconResolvedAt', '"iconResolvedAt" DATETIME');
    await this.ensureColumn('App', 'healthStatus', '"healthStatus" TEXT NOT NULL DEFAULT \'unknown\'');
    await this.ensureColumn('App', 'healthCheckedAt', '"healthCheckedAt" DATETIME');
    await this.ensureColumn('App', 'healthLatencyMs', '"healthLatencyMs" INTEGER');
    await this.ensureColumn('App', 'healthError', '"healthError" TEXT');
    await this.ensureColumn('App', 'healthEnabled', '"healthEnabled" BOOLEAN NOT NULL DEFAULT true');
    await this.$executeRawUnsafe(`DROP INDEX IF EXISTS "App_url_key";`);
    await this.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "App_userId_url_key" ON "App"("userId", "url");`);
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
    await this.ensureSettingSchema();
  }

  private async ensureDefaultUser() {
    const existing = await this.user.findFirst({ orderBy: { id: 'asc' } });
    if (existing) {
      return existing;
    }

    return this.user.create({
      data: {
        username: process.env.ADMIN_USERNAME || 'admin',
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'please-change-password', 12),
        isAdmin: true,
      },
    });
  }

  private async ensureAdminUser(userId: number) {
    const adminCount = await this.user.count({ where: { isAdmin: true } });
    if (adminCount === 0) {
      await this.user.update({ where: { id: userId }, data: { isAdmin: true } });
    }
  }

  async ensureUserWorkspace(userId: number) {
    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        this.setting.upsert({
          where: { userId_key: { userId, key } },
          update: {},
          create: { key, value, userId },
        }),
      ),
    );

    const categoryCount = await this.category.count({ where: { userId } });
    if (categoryCount > 0) {
      return;
    }

    await this.seedDefaultApps(userId);
  }

  private async assignExistingData(userId: number) {
    await this.$executeRawUnsafe(`UPDATE "Category" SET "userId" = ${userId} WHERE "userId" IS NULL;`);
    await this.$executeRawUnsafe(`UPDATE "App" SET "userId" = ${userId} WHERE "userId" IS NULL;`);
  }

  private async seedDefaultApps(userId: number) {
    const core = await this.category.create({
      data: {
        name: '核心系统',
        description: '日常使用频率最高的自研平台',
        icon: '◇',
        sortOrder: 1,
        userId,
      },
    });

    const ops = await this.category.create({
      data: {
        name: '运维中枢',
        description: '服务器、任务、资源与控制台入口',
        icon: '⌘',
        sortOrder: 2,
        userId,
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
        userId,
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
        userId,
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

  private async ensureColumn(table: string, column: string, definition: string) {
    const columns = await this.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${table}");`);
    if (columns.some((item) => item.name === column)) {
      return;
    }

    await this.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN ${definition};`);
  }

  private async ensureSettingSchema() {
    const columns = await this.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Setting");`);
    if (columns.length === 0) {
      await this.$executeRawUnsafe(`
        CREATE TABLE "Setting" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "key" TEXT NOT NULL,
          "value" TEXT,
          "userId" INTEGER NOT NULL,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Setting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await this.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Setting_userId_key_key" ON "Setting"("userId", "key");`);
      return;
    }

    const hasUserId = columns.some((item) => item.name === 'userId');
    const hasId = columns.some((item) => item.name === 'id');
    if (hasUserId && hasId) {
      await this.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Setting_userId_key_key" ON "Setting"("userId", "key");`);
      return;
    }

    const owner = await this.user.findFirst({ orderBy: { id: 'asc' } });
    if (!owner) {
      await this.user.create({
        data: {
          username: process.env.ADMIN_USERNAME || 'admin',
          passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'please-change-password', 12),
          isAdmin: true,
        },
      });
    }

    const fallbackUser = await this.user.findFirst({ orderBy: { id: 'asc' } });
    const ownerId = fallbackUser?.id || 1;
    await this.$executeRawUnsafe(`
      CREATE TABLE "Setting_next" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "key" TEXT NOT NULL,
        "value" TEXT,
        "userId" INTEGER NOT NULL,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Setting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await this.$executeRawUnsafe(`
      INSERT INTO "Setting_next" ("key", "value", "userId", "updatedAt")
      SELECT "key", "value", ${ownerId}, "updatedAt" FROM "Setting";
    `);
    await this.$executeRawUnsafe(`DROP TABLE "Setting";`);
    await this.$executeRawUnsafe(`ALTER TABLE "Setting_next" RENAME TO "Setting";`);
    await this.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Setting_userId_key_key" ON "Setting"("userId", "key");`);
  }
}
