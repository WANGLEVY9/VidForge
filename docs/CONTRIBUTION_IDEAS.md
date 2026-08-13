# Contribution Ideas

以下任务适合作为公开 Issue 的候选。创建 Issue 前应再次确认范围，并补充涉及文件和验收命令。

## Good first issues

1. 为 README 增加英文快速开始，并保持中英文命令一致。
2. 为 `formatFileSize` 和 `truncateString` 增加边界测试。
3. 将前端页面中的未转义引号 warning 修复为语义化文本。
4. 为健康检查响应补充共享 TypeScript 类型。
5. 给 Swagger 增加公开端点和认证端点的分组说明。
6. 为 `examples/` 增加一个不含凭据的合规规则样例和验证命令。
7. 为移动端 storyboard 编辑器补充键盘操作和视觉回归用例。
8. 为本地媒体 smoke fixture 增加 Windows/WSL 的 FFmpeg 排障说明。

## Help wanted

1. 实现 runtime provider registry，让 provider 能按 workspace 配置切换并保留能力声明。
2. 为 HLS/WebRTC/file preview 设计统一的 `PreviewTransport` 合同和 capability matrix。
3. 为 FFmpeg 合成路径增加超时、资源限制和大文件回归测试。
4. 为 Agent 节点增加人工审批 checkpoint 与可恢复 replay API。
5. 设计中英文国际化结构，并迁移首批核心页面。
6. 建立模型/素材许可证 provenance 字段和发布前检查。

Issue 应描述真实问题和验收标准，不要为了增加活动数量而拆成无意义的小任务。
