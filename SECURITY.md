# Security Policy

## Reporting a vulnerability

请不要在公开 Issue 中发布漏洞细节、API Key、访问令牌或用户数据。请通过 GitHub 私下联系仓库维护者 `WANGLEVY9`，并提供复现步骤、影响范围和建议的修复方式。

收到报告后，维护者会尽快确认问题、撤销受影响凭证，并在修复后发布必要的公告。

## Secret handling

所有凭证必须通过环境变量或部署平台 Secret 管理。若凭证曾被提交到仓库或日志中，应立即撤销、轮换，并清理相关公开内容。
