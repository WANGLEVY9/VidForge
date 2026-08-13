# Security Policy

## Reporting a vulnerability

请不要在公开 Issue 中发布漏洞细节、API Key、访问令牌或用户数据。请通过 GitHub 私下联系仓库维护者 `WANGLEVY9`，并提供复现步骤、影响范围和建议的修复方式。

收到报告后，维护者会尽快确认问题、撤销受影响凭证，并在修复后发布必要的公告。

## Secret handling

所有凭证必须通过环境变量或部署平台 Secret 管理。若凭证曾被提交到仓库或日志中，应立即撤销、轮换，并清理相关公开内容。

## Provider configuration permissions

`/api/ai/ark/configs/:key` 的写入和 override 清除接口仅允许 `users.role = 'admin'` 且账号处于启用状态的用户访问。普通登录用户可以查看脱敏后的配置状态，但不能修改会影响全局用户的 Provider 凭证。

生产环境应通过受控的数据库迁移或运维流程授予管理员角色，并定期复核管理员账号；不要通过公开注册接口创建管理员。
