# VidForge Roadmap

VidForge 的路线图以可复现、可贡献和可部署为优先级。时间安排会根据维护能力和社区反馈调整，不构成发布承诺。

## Now — 稳定开源基础

- [ ] 为认证、合规检查和剧本处理补充单元测试
- [x] 提供 Docker Compose 本地依赖环境
- [ ] 将 TypeScript `any` 警告逐步降至可阻断的新代码基线
- [x] 建立数据库迁移，生产环境不再依赖 schema synchronize
- [ ] 补充端到端最小冒烟测试

## Next — 可观察、可扩展的视频管线

- [x] 为 ARK、TTS、OSS 和 FFmpeg 提供统一 provider 接口
- [x] 增加失败任务重放、队列治理和队列健康检查
- [x] 提供可选 OpenTelemetry/OTLP 导出与请求级结构化 trace metadata
- [x] 增加离线可复现的缓存延迟与成本 benchmark 基线

## Later — 社区生态

- [ ] 可插拔模型和媒体处理 provider
- [x] 社区贡献模板、provider Issue 表单和示例请求
- [ ] 社区合规规则包和带许可证的示例数据集
- [ ] 国际化界面与英文文档
- [ ] 稳定 API 与扩展开发指南

欢迎在 GitHub Issues 提交具体需求。适合首次贡献的任务会使用 `good first issue`，需要设计讨论的任务会使用 `help wanted`。

可直接转化为公开任务的候选见 [Contribution Ideas](./docs/CONTRIBUTION_IDEAS.md)。
