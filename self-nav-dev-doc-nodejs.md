# 轻量级自托管导航站开发文档

## 1. 项目目标

开发一个轻量级自托管导航站，用于统一管理和访问自己部署在服务器上的多个系统。

用户可以通过后台自定义添加系统入口，例如：

- 系统名称
- 访问地址
- 图标
- 分类
- 描述
- 排序
- 是否显示
- 是否新窗口打开

前台展示为卡片式导航页，点击卡片跳转到对应系统。

项目要求：

- 轻量级
- 易部署
- 易备份
- 支持 Docker 部署
- 支持后台管理
- 支持 SQLite 本地数据库
- 不依赖复杂中间件
- 适合部署在低配 VPS 上
- 默认服务端口使用 `8081`
- 技术栈与服务器管控平台、局域网文件传输平台保持一致，统一使用 `Node.js + TypeScript + React`

---

## 2. 推荐技术方案

### 2.1 总体架构

采用：

```text
Node.js + TypeScript + NestJS + SQLite + React + Docker
```

推荐原因：

- 与服务器管控平台、局域网文件传输平台保持同一语言体系
- 前后端都使用 TypeScript，方便维护
- NestJS 项目结构清晰，适合交给 Codex 持续开发
- SQLite 无需额外部署数据库
- React 前端体验好
- Docker 部署简单
- 资源占用低
- 后续可以平滑接入统一账号、统一认证、统一管理入口

架构如下：

```text
浏览器
  |
  | 访问导航站域名
  v
Node.js / NestJS Server，监听 8081 端口
  |
  |-- 提供前端静态页面
  |-- 提供 REST API
  |-- 读写 SQLite
  |
SQLite 数据库
```

---

## 3. 技术栈选型

## 3.1 后端技术栈

推荐：

```text
Node.js 20+
TypeScript
NestJS
Prisma ORM
SQLite
bcryptjs 或 argon2
JWT + HttpOnly Cookie
class-validator
class-transformer
```

说明：

- 后端统一使用 TypeScript
- 框架使用 NestJS
- 数据库使用 SQLite
- ORM 使用 Prisma
- 登录密码使用 bcryptjs 或 argon2 加密
- 后台登录状态使用 HttpOnly Cookie 保存
- API 参数校验使用 class-validator

---

## 3.2 前端技术栈

推荐：

```text
React
TypeScript
Vite
Tailwind CSS
React Router
Axios
```

说明：

- 前端统一使用 React + TypeScript
- 构建工具使用 Vite
- 样式使用 Tailwind CSS
- 路由使用 React Router
- 请求封装使用 Axios

---

## 3.3 部署技术栈

推荐：

```text
Docker
Docker Compose
Nginx 或 Caddy 反向代理
```

最终运行方式：

```text
一个 Node.js 容器 + 一个 SQLite 数据文件
```

数据库文件挂载到宿主机：

```text
/data/nav.db
```

---

## 4. 功能范围

## 4.1 前台功能

前台页面用于日常访问系统。

### 功能清单

1. 展示所有已启用的系统入口
2. 支持按照分类分组展示
3. 支持搜索系统名称、描述、标签
4. 支持点击卡片跳转
5. 支持新窗口打开
6. 支持响应式布局，兼容手机、平板、电脑
7. 支持暗色模式
8. 支持站点标题、Logo、背景配置

### 前台页面示例

```text
我的系统导航

[搜索框：搜索系统...]

常用系统
┌──────────────┐ ┌──────────────┐
│ Jenkins       │ │ Grafana       │
│ 构建发布系统   │ │ 监控看板       │
└──────────────┘ └──────────────┘

服务器管理
┌──────────────┐ ┌──────────────┐
│ 宝塔面板       │ │ SSH 管理平台    │
│ 服务器运维入口 │ │ 统一终端平台    │
└──────────────┘ └──────────────┘
```

---

## 4.2 后台功能

后台用于管理导航数据。

后台地址：

```text
/admin
```

### 功能清单

1. 管理员登录
2. 系统入口新增、编辑、删除
3. 分类新增、编辑、删除
4. 拖拽排序，或者通过排序字段排序
5. 设置系统是否显示
6. 设置图标
7. 设置打开方式
8. JSON 导入导出
9. 修改站点基础配置

---

## 5. 页面设计

## 5.1 页面路由

```text
/                    前台导航首页
/admin/login         后台登录页
/admin               后台首页
/admin/apps          应用管理
/admin/categories    分类管理
/admin/settings      站点设置
/admin/import-export 导入导出
```

---

## 5.2 前台首页设计

### 页面结构

```text
Header
  - Logo
  - 站点名称
  - 搜索框
  - 暗色模式切换

Main
  - 分类分组
  - 应用卡片列表

Footer
  - 版权信息
  - 管理入口，可选
```

### 应用卡片字段

每个卡片展示：

```text
图标
系统名称
系统描述
标签，可选
状态，可选
```

点击卡片后跳转到对应 URL。

---

## 5.3 后台应用管理页面

字段如下：

| 字段 | 说明 |
|---|---|
| name | 系统名称 |
| url | 跳转地址 |
| description | 描述 |
| icon | 图标，可以是 emoji、URL、内置 icon 名称 |
| categoryId | 所属分类 |
| tags | 标签 |
| sortOrder | 排序值 |
| visible | 是否显示 |
| openInNewTab | 是否新窗口打开 |

后台列表支持：

- 搜索
- 分类筛选
- 启用/停用
- 编辑
- 删除
- 排序

---

## 6. 数据库设计

使用 SQLite。

数据库文件路径：

```text
/data/nav.db
```

ORM 使用 Prisma。

Prisma schema 路径：

```text
server/prisma/schema.prisma
```

---

## 6.1 Prisma 数据模型

```prisma
// server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Category {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  icon        String?
  sortOrder   Int      @default(0)
  visible     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  apps        App[]
}

model App {
  id            Int       @id @default(autoincrement())
  name          String
  url           String
  description   String?
  icon          String?
  categoryId    Int?
  tags          String?   // JSON 字符串，例如 ["监控", "运维"]
  sortOrder     Int       @default(0)
  visible       Boolean   @default(true)
  openInNewTab  Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  category      Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
}

model Setting {
  key       String   @id
  value     String?
  updatedAt DateTime @updatedAt
}
```

---

## 6.2 环境变量中的数据库配置

```env
DATABASE_URL="file:/data/nav.db"
```

如果本地开发，可以使用：

```env
DATABASE_URL="file:./dev.db"
```

---

## 6.3 初始化配置

首次启动时，如果数据库为空，需要自动初始化：

1. 创建数据表
2. 创建默认管理员账号
3. 创建默认站点配置
4. 可选：创建示例分类和示例应用

默认管理员账号通过环境变量配置：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123456
```

初始化配置：

```text
site_title = 我的导航站
site_subtitle = 个人系统统一入口
logo = 🚀
theme = auto
footer_text = Powered by Self Nav
```

---

## 7. API 设计

## 7.1 认证方式

后台接口使用登录认证。

推荐：

- 登录成功后设置 HttpOnly Cookie
- 使用 JWT 作为登录 Token
- Cookie 设置 SameSite=Lax
- 生产环境下启用 Secure
- 后台接口通过 NestJS Guard 保护

---

## 7.2 登录接口

### POST `/api/auth/login`

请求：

```json
{
  "username": "admin",
  "password": "admin123456"
}
```

响应：

```json
{
  "success": true,
  "message": "登录成功"
}
```

登录成功后，服务端写入 HttpOnly Cookie。

---

### POST `/api/auth/logout`

响应：

```json
{
  "success": true
}
```

登出时清除 Cookie。

---

### GET `/api/auth/me`

响应：

```json
{
  "id": 1,
  "username": "admin"
}
```

---

## 7.3 前台公开接口

### GET `/api/public/config`

返回站点配置。

```json
{
  "site_title": "我的导航站",
  "site_subtitle": "个人系统统一入口",
  "logo": "🚀",
  "footer_text": "Powered by Self Nav"
}
```

---

### GET `/api/public/apps`

返回前台可见的分类和应用。

```json
[
  {
    "id": 1,
    "name": "常用系统",
    "icon": "⭐",
    "apps": [
      {
        "id": 1,
        "name": "Jenkins",
        "url": "https://jenkins.example.com",
        "description": "构建发布系统",
        "icon": "🧱",
        "tags": ["CI", "发布"],
        "openInNewTab": true
      }
    ]
  }
]
```

---

## 7.4 分类管理接口

### GET `/api/admin/categories`

获取分类列表。

### POST `/api/admin/categories`

新增分类。

```json
{
  "name": "服务器管理",
  "description": "服务器相关入口",
  "icon": "🖥️",
  "sortOrder": 10,
  "visible": true
}
```

### PUT `/api/admin/categories/:id`

编辑分类。

### DELETE `/api/admin/categories/:id`

删除分类。

删除分类时，不直接删除应用，而是将相关应用的 `categoryId` 置空。

---

## 7.5 应用管理接口

### GET `/api/admin/apps`

获取应用列表。

支持查询参数：

```text
keyword
categoryId
visible
```

---

### POST `/api/admin/apps`

新增应用。

```json
{
  "name": "Grafana",
  "url": "https://grafana.example.com",
  "description": "监控面板",
  "icon": "📊",
  "categoryId": 1,
  "tags": ["监控", "看板"],
  "sortOrder": 20,
  "visible": true,
  "openInNewTab": true
}
```

---

### PUT `/api/admin/apps/:id`

编辑应用。

---

### DELETE `/api/admin/apps/:id`

删除应用。

---

## 7.6 配置管理接口

### GET `/api/admin/settings`

获取配置。

### PUT `/api/admin/settings`

更新配置。

```json
{
  "site_title": "我的系统导航",
  "site_subtitle": "统一入口",
  "logo": "🚀",
  "footer_text": "Private Nav"
}
```

---

## 7.7 导入导出接口

### GET `/api/admin/export`

导出 JSON。

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-05-09T12:00:00Z",
  "settings": {},
  "categories": [],
  "apps": []
}
```

---

### POST `/api/admin/import`

导入 JSON。

导入策略：

- 支持覆盖导入
- 支持追加导入
- URL 相同的应用默认更新
- 导入前需要校验 JSON 格式

请求：

```json
{
  "mode": "merge",
  "data": {
    "settings": {},
    "categories": [],
    "apps": []
  }
}
```

---

## 8. 后端开发要求

## 8.1 后端目录结构

推荐：

```text
server/
  package.json
  tsconfig.json
  nest-cli.json
  prisma/
    schema.prisma
    seed.ts
  src/
    main.ts
    app.module.ts
    common/
      guards/
        auth.guard.ts
      decorators/
      filters/
      interceptors/
    config/
      config.module.ts
      config.service.ts
    prisma/
      prisma.module.ts
      prisma.service.ts
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      jwt.strategy.ts
    public/
      public.module.ts
      public.controller.ts
      public.service.ts
    apps/
      apps.module.ts
      apps.controller.ts
      apps.service.ts
      dto/
        create-app.dto.ts
        update-app.dto.ts
    categories/
      categories.module.ts
      categories.controller.ts
      categories.service.ts
      dto/
        create-category.dto.ts
        update-category.dto.ts
    settings/
      settings.module.ts
      settings.controller.ts
      settings.service.ts
    import-export/
      import-export.module.ts
      import-export.controller.ts
      import-export.service.ts
    static/
      dist/
```

---

## 8.2 后端启动逻辑

启动时执行：

1. 读取环境变量
2. 初始化 Prisma Client
3. 检查 SQLite 数据库
4. 执行数据库迁移或同步
5. 如果没有管理员账号，创建默认管理员
6. 初始化默认站点配置
7. 加载前端静态文件
8. 启动 HTTP 服务
9. 默认监听 `0.0.0.0:8081`

---

## 8.3 后端环境变量

```env
NODE_ENV=production
APP_PORT=8081
DATABASE_URL="file:/data/nav.db"
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123456
COOKIE_SECURE=false
```

生产环境必须修改：

```text
JWT_SECRET
ADMIN_PASSWORD
```

---

## 8.4 main.ts 要求

`server/src/main.ts` 需要完成：

1. 创建 NestJS 应用
2. 启用全局 ValidationPipe
3. 启用 Cookie Parser
4. 启用 CORS，默认同源即可
5. 配置全局 API 前缀 `/api`
6. 生产模式下托管前端静态文件
7. 监听 `APP_PORT`，默认 `8081`

伪代码示例：

```ts
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api');
app.use(cookieParser());
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
await app.listen(process.env.APP_PORT || 8081, '0.0.0.0');
```

---

## 8.5 URL 校验规则

添加应用时，URL 必须满足：

```text
http://
https://
```

不允许空 URL。

暂时不做复杂探测，避免把导航站变成内网扫描工具。

---

## 9. 前端开发要求

## 9.1 前端目录结构

推荐：

```text
web/
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  src/
    main.tsx
    App.tsx
    api/
      client.ts
      auth.ts
      apps.ts
      categories.ts
      settings.ts
      importExport.ts
    pages/
      Home.tsx
      Login.tsx
      AdminLayout.tsx
      AdminApps.tsx
      AdminCategories.tsx
      AdminSettings.tsx
      ImportExport.tsx
    components/
      AppCard.tsx
      CategorySection.tsx
      SearchBox.tsx
      AdminTable.tsx
      ConfirmDialog.tsx
      EmptyState.tsx
    types/
      app.ts
      category.ts
      setting.ts
    styles/
      index.css
```

---

## 9.2 前台 UI 风格

整体风格：

- 简洁
- 卡片式
- 类似个人 Dashboard
- 支持深色模式
- PC 端多列布局
- 手机端单列布局

卡片样式：

```text
圆角
轻阴影
hover 上浮
图标醒目
标题清晰
描述淡色
```

---

## 9.3 后台 UI 风格

后台可以简单实用，不要太复杂。

页面结构：

```text
左侧菜单
  - 应用管理
  - 分类管理
  - 站点设置
  - 导入导出
  - 退出登录

右侧内容区
```

---

## 9.4 Axios 请求封装

要求：

1. baseURL 使用 `/api`
2. 请求默认携带 Cookie
3. 401 自动跳转到 `/admin/login`
4. 统一处理错误提示

示例：

```ts
const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
});
```

---

## 10. 权限与安全

## 10.1 必须实现

1. 后台接口必须登录后访问
2. 密码必须 bcryptjs 或 argon2 加密保存
3. Cookie 使用 HttpOnly
4. 登录失败返回统一错误，不暴露具体原因
5. 生产环境禁止使用默认 JWT_SECRET
6. 删除操作需要二次确认
7. 导入 JSON 需要格式校验
8. 防止 XSS：前端渲染文本时不要使用 `dangerouslySetInnerHTML`
9. 后台接口使用 NestJS Guard 保护
10. 登录接口添加简单限流，防止暴力破解

---

## 10.2 可以暂缓实现

以下功能不是 MVP 必须项：

- 多用户
- 角色权限
- OAuth 登录
- LDAP 登录
- 应用健康检查
- 访问统计
- 操作日志

---

## 11. Docker 部署

## 11.1 Dockerfile 要求

目标：

- 前端构建生成静态文件
- 后端编译 TypeScript
- 安装生产依赖
- 生成 Prisma Client
- 最终镜像只包含运行必需文件
- 数据库挂载到 `/data`
- 容器内服务监听 `8081`

构建流程：

```text
1. 构建 web，生成 web/dist
2. 构建 server，生成 server/dist
3. 将 web/dist 复制到 server/static/dist
4. 运行 Node.js 服务
```

---

## 11.2 docker-compose.yml

```yaml
services:
  self-nav:
    image: self-nav:latest
    container_name: self-nav
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      - NODE_ENV=production
      - APP_PORT=8081
      - DATABASE_URL=file:/data/nav.db
      - JWT_SECRET=please-change-this-secret
      - JWT_EXPIRES_IN=7d
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=please-change-password
      - COOKIE_SECURE=false
    volumes:
      - ./data:/data
```

访问：

```text
http://服务器IP:8081
```

如果通过域名访问，可以放在 Nginx 或 Caddy 后面。

---

## 12. Caddy 反向代理示例

```caddyfile
nav.example.com {
  reverse_proxy 127.0.0.1:8081
}
```

---

## 13. Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name nav.example.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 14. 初始化数据示例

首次启动可以内置几个示例分类和应用。

### 分类

```json
[
  {
    "name": "常用系统",
    "icon": "⭐",
    "sortOrder": 1
  },
  {
    "name": "服务器管理",
    "icon": "🖥️",
    "sortOrder": 2
  },
  {
    "name": "监控运维",
    "icon": "📊",
    "sortOrder": 3
  }
]
```

### 应用

```json
[
  {
    "name": "宝塔面板",
    "url": "https://bt.example.com",
    "description": "服务器面板",
    "icon": "🧰",
    "tags": ["服务器", "面板"],
    "sortOrder": 1
  },
  {
    "name": "Grafana",
    "url": "https://grafana.example.com",
    "description": "监控看板",
    "icon": "📊",
    "tags": ["监控"],
    "sortOrder": 2
  }
]
```

---

## 15. 开发优先级

## 第一阶段：MVP

必须完成：

1. 前台导航首页
2. 后台登录
3. 应用 CRUD
4. 分类 CRUD
5. 站点配置
6. SQLite 持久化
7. Docker 部署
8. 默认端口 `8081`
9. 后端使用 Node.js + TypeScript + NestJS
10. 前端使用 React + TypeScript

---

## 第二阶段：体验增强

可以继续做：

1. 搜索
2. 暗色模式
3. JSON 导入导出
4. 图标选择器
5. 拖拽排序
6. 移动端优化

---

## 第三阶段：高级功能

后续可选：

1. 应用访问统计
2. 健康检查
3. 多用户
4. 操作日志
5. 应用截图预览
6. 内置 OpenSearch 浏览器搜索
7. 支持配置为浏览器首页
8. 与服务器管控平台做统一登录
9. 与局域网文件传输平台做统一入口

---

## 16. Codex 开发任务说明

可以把下面这段直接给 Codex：

```text
请开发一个轻量级自托管导航站，项目名 self-nav。

技术栈要求：
- 后端使用 Node.js + TypeScript + NestJS
- 前端使用 React + TypeScript + Vite + Tailwind CSS
- 数据库使用 SQLite
- ORM 使用 Prisma
- 支持 Docker 部署
- 默认服务端口使用 8081
- 后端需要提供 REST API
- 前端构建后的静态文件由 NestJS 后端统一提供
- 技术栈需要与服务器管控平台、局域网文件传输平台保持一致，不要使用 Go 语言

核心功能：
1. 前台首页展示导航应用卡片
2. 应用按照分类分组展示
3. 支持搜索应用名称、描述、标签
4. 点击应用卡片跳转到对应 URL
5. 支持后台登录
6. 后台支持应用新增、编辑、删除、显示/隐藏
7. 后台支持分类新增、编辑、删除
8. 后台支持站点配置修改
9. 支持 JSON 导入导出
10. 支持 Docker Compose 部署

数据库使用 SQLite，数据库文件存放在 /data/nav.db。

服务端口要求：
- 后端默认监听 0.0.0.0:8081
- Docker 容器内端口为 8081
- docker-compose 端口映射为 8081:8081
- README、Dockerfile、docker-compose、反向代理示例中都必须统一使用 8081

请使用 Prisma 实现以下数据模型：
- User
- Category
- App
- Setting

认证要求：
- 登录接口 POST /api/auth/login
- 登出接口 POST /api/auth/logout
- 当前用户接口 GET /api/auth/me
- 后台接口需要登录后访问
- 密码使用 bcryptjs 或 argon2 加密
- 登录状态使用 HttpOnly Cookie
- 后台接口使用 NestJS Guard 保护

公开接口：
- GET /api/public/config
- GET /api/public/apps

后台接口：
- GET /api/admin/apps
- POST /api/admin/apps
- PUT /api/admin/apps/:id
- DELETE /api/admin/apps/:id
- GET /api/admin/categories
- POST /api/admin/categories
- PUT /api/admin/categories/:id
- DELETE /api/admin/categories/:id
- GET /api/admin/settings
- PUT /api/admin/settings
- GET /api/admin/export
- POST /api/admin/import

前端页面：
- /
- /admin/login
- /admin
- /admin/apps
- /admin/categories
- /admin/settings
- /admin/import-export

UI 要求：
- 前台卡片式导航
- 支持响应式布局
- 支持暗色模式
- 后台简单实用，左侧菜单，右侧内容
- 表单校验完整
- 删除需要确认

部署要求：
- 提供 Dockerfile
- 提供 docker-compose.yml
- 提供 .env.example
- 提供 README.md
- README 中说明如何构建、启动、初始化管理员账号、备份数据库
- 所有部署示例统一使用 8081 端口

请按照生产可用标准开发，代码结构清晰，错误处理完整。
```

---

## 17. README 需要包含的内容

Codex 开发时需要生成 README，至少包含：

```text
1. 项目介绍
2. 功能截图占位
3. 技术栈
4. 本地开发
5. Docker 部署
6. 环境变量说明
7. 默认账号说明
8. 数据备份方式
9. 常见问题
10. 后续计划
```

---

## 18. 推荐最终目录结构

```text
self-nav/
  README.md
  Dockerfile
  docker-compose.yml
  .env.example

  server/
    package.json
    tsconfig.json
    nest-cli.json
    prisma/
      schema.prisma
      seed.ts
    src/
      main.ts
      app.module.ts
      common/
      config/
      prisma/
      auth/
      public/
      apps/
      categories/
      settings/
      import-export/
      static/

  web/
    package.json
    vite.config.ts
    tsconfig.json
    index.html
    src/
      main.tsx
      App.tsx
      api/
      pages/
      components/
      types/
      styles/

  data/
    .gitkeep
```

---

## 19. package.json 脚本建议

### 根目录 package.json

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev -w server\" \"npm run dev -w web\"",
    "build": "npm run build -w web && npm run build -w server",
    "start": "npm run start:prod -w server"
  },
  "workspaces": [
    "server",
    "web"
  ]
}
```

### server/package.json

```json
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start:prod": "node dist/main.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy",
    "prisma:dev": "prisma migrate dev",
    "seed": "tsx prisma/seed.ts"
  }
}
```

### web/package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## 20. 验收标准

开发完成后，必须满足：

1. 执行 `docker compose up -d` 可以启动
2. 容器监听端口为 `8081`
3. 访问 `http://服务器IP:8081` 能看到导航首页
4. 访问 `/admin/login` 可以登录后台
5. 可以新增分类
6. 可以新增应用
7. 前台能展示新增的应用
8. 点击应用可以跳转
9. 刷新页面数据不丢失
10. 重启容器数据不丢失
11. 可以导出 JSON
12. 可以导入 JSON
13. 手机浏览器访问布局正常
14. Caddy/Nginx 反向代理到 `127.0.0.1:8081` 正常访问
15. 代码中不能使用 Go 作为后端语言
16. 后端必须是 Node.js + TypeScript

---

## 21. 部署建议

这个导航站本身很轻，正常情况下：

```text
1 核 CPU
512MB 内存
5GB 磁盘
```

就够用了。

如果服务器上已经有 Nginx、Caddy、OpenResty 或 1Panel，可以直接反代到容器的 `8081` 端口。

比较推荐的域名：

```text
nav.example.com
home.example.com
start.example.com
go.example.com
```

---

## 22. 后续可加的实用功能

建议后面可以加这几个，性价比比较高：

| 功能 | 价值 |
|---|---|
| 应用图标自动获取 favicon | 添加地址后自动显示图标 |
| 应用健康状态 | 看系统是否在线 |
| 拖拽排序 | 后台体验更好 |
| 访问次数统计 | 知道哪个系统最常用 |
| 浏览器搜索入口 | 把导航站设为浏览器首页 |
| 简单公告栏 | 放一些服务器维护提醒 |
| 快捷命令区 | 例如 SSH、面板、监控入口集中显示 |
| 统一登录 | 与其他自研平台打通 |

---

## 23. 端口统一要求

本项目所有涉及端口的位置必须统一使用 `8081`，包括但不限于：

- NestJS 后端默认监听端口
- 环境变量 `APP_PORT`
- Dockerfile 暴露端口
- docker-compose 端口映射
- README 部署说明
- Caddy 反向代理示例
- Nginx 反向代理示例
- 验收测试说明

禁止再出现 `8080` 作为默认端口。

---

## 24. 技术栈统一要求

本项目需要与服务器管控平台、局域网文件传输平台保持同一语言体系。

统一要求：

```text
后端：Node.js + TypeScript + NestJS
前端：React + TypeScript + Vite
数据库：SQLite
ORM：Prisma
部署：Docker Compose
```

