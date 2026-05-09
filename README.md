# AtlasGate 星渡枢航

AtlasGate 星渡枢航是一个轻量级自托管导航站，用来统一管理、访问和沉淀个人服务器上的多个系统入口。项目预置了“邻渡”和“云枢控制台”两个系统，并在系统详情中提供可点击的功能索引页。

## 功能

- 前台卡片式导航，按分类展示系统入口
- 导航首页需要登录后访问
- 分类、应用、站点设置和导入导出数据按登录用户隔离
- 搜索系统名称、描述与标签
- 系统详情页与功能索引
- 后台登录、应用管理、分类管理、站点设置
- JSON 导入导出，支持备份和迁移
- SQLite 本地数据库，默认挂载到 `/data/nav.db`
- Docker Compose 部署，默认服务端口 `8081`
- Nginx 一键反向代理脚本，默认域名 `nav.louing.site`

## 技术栈

- 后端：Node.js + TypeScript + NestJS + Prisma + SQLite
- 前端：React + TypeScript + Vite + Tailwind CSS
- 认证：JWT + HttpOnly Cookie + bcryptjs
- 部署：Docker + Docker Compose + Nginx

## 本地开发

```bash
npm install
npm run prisma:generate
npm run dev
```

本地开发时，后端默认监听 `0.0.0.0:8081`，前端 Vite 默认监听 `5173` 并代理 `/api` 到 `8081`。

## Docker 部署

```bash
cp .env.example .env
# 修改 .env 中的 JWT_SECRET 和 ADMIN_PASSWORD
docker compose up -d --build
```

访问：

```text
http://服务器IP:8081
```

后台：

```text
http://服务器IP:8081/admin/login
```

导航首页 `/` 和后台 `/admin` 都需要登录。每个用户只能看到自己的分类、应用、站点设置和导入导出数据。首次启动会根据 `.env` 自动创建默认管理员，已有旧版本数据会在升级启动时归属到第一个用户。

## 一键部署

在服务器上执行：

```bash
bash scripts/deploy.sh
```

脚本会安装 Docker、拉取或更新仓库、生成 `.env`、构建镜像并启动容器。

## 一键 Nginx

域名 `nav.louing.site` 已写入脚本：

```bash
sudo bash scripts/install-nginx.sh
```

脚本会生成 Nginx 站点配置，将域名反代到 `127.0.0.1:8081`。如果服务器已安装 `certbot`，脚本会尝试签发 HTTPS 证书。

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `NODE_ENV` | `production` | 运行环境 |
| `APP_PORT` | `8081` | 服务端口 |
| `DATABASE_URL` | `file:/data/nav.db` | SQLite 数据库路径 |
| `JWT_SECRET` | `please-change-this-secret` | JWT 密钥，生产必须修改 |
| `JWT_EXPIRES_IN` | `7d` | 登录有效期 |
| `ADMIN_USERNAME` | `admin` | 初始管理员用户名 |
| `ADMIN_PASSWORD` | `please-change-password` | 初始管理员密码，生产必须修改 |
| `COOKIE_SECURE` | `false` | HTTPS Cookie Secure 开关 |

## 默认账号

首次启动时，如果数据库中没有用户，会根据环境变量创建管理员账号：

```text
用户名：admin
密码：please-change-password
```

生产环境请务必在 `.env` 中修改 `ADMIN_PASSWORD` 和 `JWT_SECRET`。

## 数据备份

SQLite 数据文件在宿主机 `./data/nav.db`：

```bash
cp data/nav.db "data/nav-$(date +%Y%m%d-%H%M%S).db"
```

也可以在后台的“导入导出”页面导出 JSON 备份。

## 常见问题

- 页面无法访问：确认容器运行中，并检查 `8081` 端口是否被占用。
- 登录失败：确认 `.env` 中管理员密码是否为首次初始化时使用的值。
- 数据重启后丢失：确认 `docker-compose.yml` 中 `./data:/data` 挂载存在。
- 域名无法访问：确认 DNS 已解析到服务器，Nginx 配置已启用。

## 后续计划

- 应用图标自动获取 favicon
- 健康检查与状态徽标
- 拖拽排序
- 访问次数统计
- 与“邻渡”“云枢控制台”打通统一登录
