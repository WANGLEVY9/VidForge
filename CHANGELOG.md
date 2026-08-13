# Changelog

本项目的重要变化记录于此，并遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 的基本结构。

## Unreleased

### Added

- 开源治理、贡献、安全与社区模板
- CI 构建、Lint、依赖审计和全历史密钥扫描
- 本地环境检查及其自动化测试

### Changed

- 更新存在已知漏洞的生产依赖
- ARK、OSS、JWT 等凭证仅允许从环境或部署 Secret 注入

### Security

- 从可达 Git 历史中移除已发现的凭证内容
- 生产环境要求强 JWT 密钥，并禁止自动播种演示账号
