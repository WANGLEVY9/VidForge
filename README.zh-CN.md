<p align="center">
  <img src="./.github/assets/social-preview.jpg" alt="VidForge — Multi-Agent 视频生成工作台" width="920" />
</p>

<h1 align="center">VidForge</h1>

<p align="center">
  <strong>面向知识增强视频生成的开源 Multi-Agent 基础设施。</strong><br />
  将素材理解、品牌知识、上下文工程、剧本规划、视频生成、质量反馈与媒体合成连接成可观测的生产流水线。
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.de.md">Deutsch</a> ·
  <a href="./README.ru.md">Русский</a>
</p>

<p align="center">
  <a href="https://github.com/WANGLEVY9/VidForge/actions/workflows/ci.yml"><img src="https://github.com/WANGLEVY9/VidForge/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-d6b36a.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/stack-TypeScript-3178c6.svg" alt="TypeScript" />
</p>

<p align="center">
  <a href="https://vid-forge-frontend-nu.vercel.app/">在线展示</a> ·
  <a href="./docs/AGENT_RUNTIME.md">Agent 运行时</a> ·
  <a href="./docs/TECHNICAL_ARCHITECTURE.md">技术架构</a> ·
  <a href="./ROADMAP.md">路线图</a>
</p>

> **项目状态：积极开发中。** VidForge 可以在没有付费模型凭据的情况下构建、测试和探索；真实的文本、视觉、视频和 TTS 生成需要配置对应 Provider。在线展示站是独立部署，未必启用所有 Provider。

## VidForge 是什么？

VidForge 是一个可自托管的 AI 视频生产工作台，面向商品内容和产品叙事。它不会把视频生成简化成一次模型调用，而是把一次请求编排成有状态的工作流：专用 Agent 检索素材、组装受控上下文、规划分镜、调用媒体 Provider、评估结果，并把质量证据反馈给下一次尝试。

| 关注点           | 当前实现                                                    |
| ---------------- | ----------------------------------------------------------- |
| Multi-Agent 编排 | 显式 LangGraph 状态、专用节点、条件式重规划、有限重试与取消 |
| 知识增强生成     | Script RAG、商品空间知识、素材检索与可追溯引用              |
| 上下文工程       | 分作用域长期记忆、检索评分、Prompt 预算、内容清洗与反馈注入 |
| 可执行视频流水线 | 并行镜头生成、FFmpeg 合成、TTS、BGM、字幕、存储与进度推送   |

## Agent 工作流

```text
START
  │
  ▼
orchestrator
  │
  ▼
material_analysis ──▶ script_generation ──▶ video_composition ──▶ quality_control
                             ▲                                         │
                             └──────── 有界质量重规划 ──────────────────┘
```

| Agent             | 主要职责                                             | 输出                         |
| ----------------- | ---------------------------------------------------- | ---------------------------- |
| Material Agent    | 在用户和商品空间范围内检索图片，进行确定性相关性排序 | 最多五个素材候选与说明       |
| Script Agent      | 融合请求、素材、RAG、记忆和上一次质量反馈            | Hook / Demo / CTA 三镜头方案 |
| Composition Agent | 以有限并行批次生成镜头并轮询 Provider 任务           | 镜头结果与最终媒体 URL       |
| Quality Agent     | 检查完整性、时长、一致性、合规与 Hook 强度           | 五维评分、问题和重规划反馈   |

系统使用显式工作流而非不可控的 Agent 群体。Provider 或瞬时网络错误使用带指数退避和抖动的有限重试；取消、输入错误和 HTTP 4xx 不重试；质量重规划由 `AGENT_QC_MAX_RETRIES` 单独限制。

## 知识库与检索

VidForge 将三类知识分开管理，以区分所有权、生命周期和可信度：

1. **商品空间知识**：卖点、目标受众、品牌语气、价格定位、禁用词和最多五条高质量脚本模式。质量分数至少 85 且不是 fallback 的运行结果，才可以幂等写入最佳实践。
2. **Script RAG 语料**：内置 9 条结构化种子，覆盖 7 个电商类别。每条包含 Hook 类型、Hook / Demo / CTA 骨架、卖点示例、BGM 方向和引用元数据。
3. **素材检索**：素材记录包含用户与商品空间隔离、标签、分析元数据、说明文字以及可选的 1024 维 pgvector embedding。当前 Agent 使用 SQL 与确定性启发式评分；语义 API 为 embedding Provider 保留了扩展点。

Script RAG 当前采用可复现的确定性检索：类别精确匹配权重最高，风格匹配提供次级得分，部分匹配提供较小加分，Prompt 默认使用前两条种子，并返回带 ID 和 Hook 元数据的 `ragReferences`。这套种子是开发基线，不是转化率或线上效果基准。

## 上下文与长期记忆

Script Agent 接收当前请求、商品空间事实、RAG 引用、历史质量反馈和记忆包。记忆不会以无限对话形式拼入 Prompt，而是经过 Context Packet：

- 过滤低于阈值的命中；
- 按得分和 ID 稳定排序；
- 限制条数与字符预算；
- 删除控制字符并转义敏感标记；
- 保留记忆 ID、类型、得分和来源；
- 将内容标记为参考数据而非模型指令。

长期记忆位于 `agent_memories`，支持 `user`、`product_space`、`run` 三类作用域，以及 `preference`、`fact`、`success_pattern`、`failure_pattern`、`decision` 五种类型。初始检索器保持 Provider-neutral：

```text
score = lexical_match × 0.65 + importance × 0.25 + recency × 0.10
```

记忆故障采用 fail-soft 策略，不会阻断视频生成。未来可在不改变 Agent 契约的情况下接入 pgvector 混合检索、重排、记忆合并、矛盾处理和衰减机制。

## 质量闭环与媒体流水线

Quality Agent 按以下权重评分：完整性 30%、时长 15%、一致性 20%、合规 20%、Hook 强度 15%。加权分数达到 70 且没有合规命中时通过，否则把结构化问题和自然语言反馈送回 Script Agent，形成有界反思循环。

Composition Agent 的实际路径包括：

1. 通过视频 Provider 生成文生视频或图生视频镜头；
2. 最多三个镜头并行请求，并在八分钟内轮询；
3. 使用 FFmpeg 规范化、拼接视频片段；
4. 合成语音或生成静音 fallback，混合 BGM；
5. 生成 SRT 字幕并在支持时烧录；
6. 发布到本地存储或 OSS，返回时长、大小、SHA-256 和媒体特征。

即使某个镜头失败，也会保留成功镜头；最终合成失败时，首个成功镜头可作为预览。未配置视频 Provider 时，工作流会明确报告能力缺失，不会把占位结果伪装成完成品。

## Provider、队列与可观测性

文本、视频、TTS、对象存储和媒体处理都通过业务级 TypeScript 契约隔离。当前适配器包括 ARK 文本/视频、Volcano/OpenSpeech TTS、阿里云 OSS 和 FFmpeg。

- BullMQ 覆盖镜头生成、合成、导出和素材分析；Redis 不可用时，开发环境可使用进程内 fallback。
- ARK 响应使用 Redis 跨进程缓存，并以进程内 LRU 作为 fallback。
- `trace_spans` 记录任务、作用域、span、延迟、状态、模型、Token、估算成本、缓存命中和元数据。
- Agent 额外记录重试次数、trace-span 数量、记忆命中数、最高记忆得分和 RAG 引用数量。

## 能力边界与路线图

当前已经实现：前端工作台、认证、商品空间、素材、脚本、任务、Multi-Agent 状态图、质量重规划、基础 RAG、作用域记忆、FFmpeg 合成和可选队列/缓存路径。

当前仍属于路线图：持久化 LangGraph checkpoint、Worker 重启后的节点级恢复、人机审批与 interrupt-resume、动态子 Agent 路由、技能和工具注册表、混合 RAG 重排以及 Agent 轨迹评测数据集。

路线图参考了 [LangGraph.js](https://github.com/langchain-ai/langgraphjs)、[DeerFlow](https://github.com/bytedance/deer-flow)、[Letta](https://github.com/letta-ai/letta) 和 [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents) 所代表的设计方向，但不宣称功能对等或代码复用。

## 快速开始

### 环境要求

- Node.js 20
- pnpm `8.15.4`
- Docker Compose
- FFmpeg 4 或更高版本

```bash
git clone https://github.com/WANGLEVY9/VidForge.git
cd VidForge
corepack enable
corepack prepare pnpm@8.15.4 --activate
pnpm install --frozen-lockfile
docker compose up -d
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
pnpm --filter @vidforge/backend migration:run
pnpm check:env
pnpm dev
```

本地默认地址：前端 `http://localhost:3000`，体验流程 `/try`，工作台 `/workspace`，API `http://localhost:3001/api`，Swagger `/api/docs`，健康检查 `/api/health`。没有 Provider 凭据时请移除示例中的占位 `ARK_*` 值；真实生成需要有效的 Provider 配置。

常用验证命令：

```bash
pnpm docs:check
pnpm check:hygiene
pnpm test
pnpm lint
pnpm stylelint
pnpm build
pnpm verify
```

## API 导航

| 领域     | 示例端点                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------- |
| 认证     | `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`                                |
| 商品空间 | `GET /api/spaces`、`POST /api/spaces`、`PATCH /api/spaces/:id`                                       |
| 素材     | `POST /api/material/upload`、`PATCH /api/material/:id/analyze`、`POST /api/material/search/semantic` |
| 脚本     | `POST /api/script/generate`、`GET /api/script/inspire`、`PATCH /api/script/:id/shots`                |
| Agent    | `POST /api/agent/run`、`GET /api/agent/status/:taskId`、`POST /api/agent/cancel/:taskId`             |
| 记忆     | `GET /api/agent/memory`、`DELETE /api/agent/memory/:id`                                              |
| 追踪     | `GET /api/analytics/traces`、`GET /api/analytics/cost`                                               |

完整请求与响应以 Swagger 为准，Provider-neutral 请求样例位于 [`examples/`](./examples)。

## 仓库结构与贡献

```text
apps/frontend/src/              # React/Vite 工作台、页面、组件、状态与客户端
apps/backend/src/modules/agent/ # 图、Agent、运行控制、记忆与 Context Packet
apps/backend/src/modules/rag/   # 结构化 Script RAG 语料
apps/backend/src/modules/media/ # FFmpeg、TTS、BGM、字幕与存储
apps/backend/src/providers/     # Provider 契约与适配边界
docs/                           # 架构、运行时、部署、观测与贡献文档
examples/                       # 无凭据请求样例
scripts/                        # 文档、环境、基准和仓库检查
```

欢迎贡献 Provider 适配器、混合检索与 RAG 评测、记忆合并、checkpoint、人机审批、视频质量、字幕音频、无障碍和部署可靠性。请先阅读 [`CONTRIBUTING.md`](./CONTRIBUTING.md)、[`docs/CONTRIBUTOR_QUICKSTART.md`](./docs/CONTRIBUTOR_QUICKSTART.md) 和 [`GOVERNANCE.md`](./GOVERNANCE.md)。

请勿提交 API Key、JWT Secret、数据库凭据、生产媒体或用户数据。通过本地 `.env`、部署平台 Secret 或 CI Secret 注入凭据。安全问题请遵循 [`SECURITY.md`](./SECURITY.md) 的披露流程。

VidForge 使用 [MIT License](./LICENSE)。项目独立于 OpenAI、Anthropic、ByteDance、Volcano Engine、TikTok、LangChain 及本文档引用的其他项目。

英文版包含更完整的技术说明：[`README.md`](./README.md)。
