# VidForge Roadmap

VidForge 的路线图以可复现、可贡献和可部署为优先级。时间安排会根据维护能力和社区反馈调整，不构成发布承诺。

## Now — 稳定开源基础

- [ ] 为认证、合规检查和剧本处理补充单元测试
- [ ] 提供 Docker Compose 本地依赖环境
- [ ] 将 TypeScript `any` 警告逐步降至可阻断的新代码基线
- [ ] 建立数据库迁移，生产环境不再依赖 schema synchronize
- [ ] 补充端到端最小冒烟测试

## Next — 可观察、可扩展的视频管线

- [ ] 为 ARK、TTS、OSS 和 FFmpeg 提供统一 provider 接口
- [ ] 增加失败任务重放、队列治理和资源配额
- [ ] 提供 OpenTelemetry 导出与结构化日志
- [ ] 增加可复现的质量与成本 benchmark

## Later — 社区生态

- [ ] 可插拔模型和媒体处理 provider
- [ ] 社区模板、合规规则包和示例数据集
- [ ] 国际化界面与英文文档
- [ ] 稳定 API 与扩展开发指南

欢迎在 GitHub Issues 提交具体需求。适合首次贡献的任务会使用 `good first issue`，需要设计讨论的任务会使用 `help wanted`。

可直接转化为公开任务的候选见 [Contribution Ideas](./docs/CONTRIBUTION_IDEAS.md)。
