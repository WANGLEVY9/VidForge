# VidForge Launch Kit

这份材料用于真实发布和社区交流。发布前请根据当时可验证状态更新内容，不要添加虚构用户、Star、性能数据或合作关系。

## 一句话介绍

VidForge 是一个 MIT 许可的开源 AIGC 电商短视频生产管线，使用 React、NestJS、LangGraph、ARK、FFmpeg、BullMQ 与 pgvector 串联素材理解、剧本、分镜、合成和成本追踪。

## 中文发布稿

> 我开源了 VidForge：一个面向电商短视频的端到端 AI 生产管线。
>
> 它将素材理解、RAG 剧本、多 Agent 编排、视频生成、FFmpeg 合片、字幕/TTS/BGM、任务队列和成本追踪放在同一个 TypeScript monorepo 中。项目采用 MIT License，提供在线 Demo、Docker Compose 本地依赖环境、CI、CodeQL 和贡献路线图。
>
> 当前仍在积极开发，特别希望获得关于 provider 抽象、测试、数据库迁移、可观测性和国际化的反馈与贡献。
>
> Repository: https://github.com/WANGLEVY9/VidForge
> Demo: https://vid-forge-frontend-nu.vercel.app/

## English launch post

> I open-sourced VidForge, an end-to-end AI production pipeline for short-form commerce videos.
>
> It connects multimodal asset understanding, RAG-assisted scripts, multi-agent orchestration, video generation, FFmpeg composition, captions/TTS/BGM, queues, and cost tracing in one TypeScript monorepo. It is MIT licensed and includes a live demo, Docker Compose setup, CI, CodeQL, and a public roadmap.
>
> The project is actively evolving. Feedback and contributions around provider abstractions, testing, database migrations, observability, and internationalization are especially welcome.
>
> Repository: https://github.com/WANGLEVY9/VidForge
> Demo: https://vid-forge-frontend-nu.vercel.app/

## 推荐 GitHub Topics

`aigc`, `ai-video`, `video-generation`, `ecommerce`, `short-video`, `langgraph`, `multi-agent`, `nestjs`, `react`, `typescript`, `ffmpeg`, `pgvector`, `bullmq`, `generative-ai`, `open-source`

Topics 应保持与项目实际能力一致。不要添加与代码无关的热门标签。

## 发布渠道适配

- GitHub Discussions：解释技术决策并征集具体反馈。
- Hacker News / Show HN：突出可运行技术架构、局限与希望讨论的问题。
- Reddit：选择确实相关且允许自我推广的社区，遵守每个社区规则。
- V2EX、掘金、知乎：发布技术复盘，不只贴链接；包含架构取舍和真实踩坑。
- LinkedIn / X：使用短版介绍、Social Preview 和 Demo 链接。

不要跨社区复制高频重复内容。针对每个社区补充有价值的上下文，并在发布后认真回复反馈。

## 可验证信息清单

- [ ] Demo 当前返回成功状态并可完成声明的操作
- [ ] GitHub Actions 在 `main` 上通过
- [ ] 最新 Release 与 CHANGELOG 一致
- [ ] README 的架构和依赖版本与代码一致
- [ ] 不包含未轮换凭证或敏感日志
- [ ] 所有性能和使用数据都注明测量方法与日期
