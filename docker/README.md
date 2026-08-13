# VidForge 本地依赖环境

根目录的 `docker-compose.yml` 只启动本地开发所需的 PostgreSQL/pgvector 和 Redis，不会启动应用容器，也不会接触生产凭证。

```bash
# 启动依赖
docker compose up -d

# 查看健康状态
docker compose ps

# 停止服务，保留数据卷
docker compose down

# 删除本地数据库和 Redis 数据（不可恢复）
docker compose down -v
```

默认连接信息：

- PostgreSQL：`postgresql://vidforge:vidforge-local@localhost:5432/vidforge`
- Redis：`redis://localhost:6379`

首次启动后，使用仓库声明的迁移命令创建/升级表结构：

```bash
pnpm --filter @vidforge/backend migration:run
```

Windows/WSL 用户请在 Docker Desktop 中启用 Linux containers，并从 WSL 项目目录运行相同命令。不要将 `docker compose down -v` 用于共享或生产数据库。
