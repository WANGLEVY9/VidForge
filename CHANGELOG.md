# Changelog

本项目的重要变化记录于此，并遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 的基本结构。

## Unreleased

### Added

- 开源治理、贡献、安全与社区模板
- CI 构建、Lint、依赖审计和全历史密钥扫描
- 本地环境检查及其自动化测试
- 无需登录的响应式项目展示页与交互式工作流说明
- 搜索引擎、Open Graph、robots.txt 和 sitemap 元数据
- Agent Provider 操作账本：稳定幂等键、远端任务 ID、尝试次数和终态审计
- Agent 运行审计接口：用户可查看控制面、紧凑 checkpoint 时间线和脱敏 Provider 操作
- LangGraph PostgreSQL checkpoint、节点级恢复和独立 Agent Worker
- Agent transactional outbox、HITL interrupt/resume、checkpoint inspection、replay/fork API
- API、Agent Worker 与 Media Worker 的角色隔离，以及可配置 Agent Worker 并发度

### Changed

- 更新存在已知漏洞的生产依赖
- ARK、OSS、JWT 等凭证仅允许从环境或部署 Secret 注入
- 业务布局改为延迟加载，并为前端包体设置自动化预算
- Service Worker 对导航请求采用 network-first，避免长期缓存旧页面

### Security

- 从可达 Git 历史中移除已发现的凭证内容
- 生产环境要求强 JWT 密钥，并禁止自动播种演示账号
