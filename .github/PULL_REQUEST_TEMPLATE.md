## 变更说明

<!-- 说明改了什么、为什么改。 -->

### 变更类型

- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档 / 示例
- [ ] 性能 / 可观测性
- [ ] 依赖 / 部署

## 验证方式

- [ ] `pnpm --filter @vidforge/frontend lint`
- [ ] `pnpm --filter @vidforge/frontend build`
- [ ] `pnpm --filter @vidforge/backend build`
- [ ] `pnpm test:repo`
- [ ] `pnpm docs:check`
- [ ] 若涉及媒体管线，已运行 backend smoke test 或说明 FFmpeg 不可用

## 安全检查

- [ ] 未提交 `.env`、密钥、密码、令牌、用户数据或生成物
- [ ] 若涉及 API/数据处理，已说明兼容性与隐私影响
- [ ] 若涉及第三方模型/媒体 provider，已记录许可证、条款和 provenance 影响
