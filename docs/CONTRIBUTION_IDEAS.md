# Contribution Ideas

以下任务适合作为公开 Issue 的候选。创建 Issue 前应再次确认范围，并补充涉及文件和验收命令。

## Good first issues

1. 为 README 增加英文快速开始，并保持中英文命令一致。
2. 为 `formatFileSize` 和 `truncateString` 增加边界测试。
3. 将前端页面中的未转义引号警告修复为语义化文本。
4. 为环境检查脚本增加缺少 `pnpm-workspace.yaml` 的失败测试。
5. 为健康检查响应补充共享 TypeScript 类型。
6. 给 Swagger 增加公开端点和认证端点的分组说明。
7. 为 Docker Compose 增加 Windows/WSL 使用说明。
8. 给合规规则增加一个可复现的最小示例。

## Help wanted

1. 设计并实现 TypeORM migrations，替代生产 schema synchronize。
2. 将 ARK、TTS、对象存储和 Embedding 抽象为可插拔 provider。
3. 建立不依赖付费 API 的端到端冒烟测试。
4. 为 FFmpeg 合成路径增加基准、超时和资源限制测试。
5. 设计中英文国际化结构，并迁移首批核心页面。

Issue 应描述真实问题和验收标准，不要为了增加活动数量而拆成无意义的小任务。
