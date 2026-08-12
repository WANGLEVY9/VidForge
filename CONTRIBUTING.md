# Contributing to VidForge

感谢你对 VidForge 的兴趣！欢迎通过 Issue、Pull Request 和文档改进参与项目。

## 开始之前

- 请先搜索已有 Issue，避免重复提交。
- 涉及安全问题请不要公开提交 Issue，按照 `SECURITY.md` 联系维护者。
- 不要提交 `.env`、API Key、密码、用户数据、生成的视频或其他私密文件。

## 本地开发

1. 安装 Node.js 18+、pnpm 8+、PostgreSQL 14+ 和 FFmpeg。
2. 复制 `apps/backend/.env.example` 为 `.env` 并填写本地配置。
3. 运行 `pnpm install`。
4. 使用 `pnpm dev` 启动前后端。

## Pull Request

- 保持改动聚焦，并说明动机、行为变化和验证方式。
- 为 bug 修复或新功能补充测试；至少运行相关 lint/build。
- 不要把部署平台配置、生成物或密钥提交到仓库。

## 提交信息

建议使用 Conventional Commits，例如 `feat: add storyboard export`、`fix: handle missing ark credentials`。
