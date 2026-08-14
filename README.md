<p align="center">
  <img src="./.github/assets/social-preview.jpg" alt="VidForge open-source AI video production pipeline" width="920" />
</p>

<h1 align="center">VidForge</h1>

<p align="center">
  <strong>一个面向真实生产的开源 AI 视频创作工作台</strong><br />
  从商品素材、品牌知识与创意意图，到可播放、可追踪、可复盘的视频成片。
</p>

<p align="center">
  <a href="https://github.com/WANGLEVY9/VidForge/actions/workflows/ci.yml"><img src="https://github.com/WANGLEVY9/VidForge/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="https://github.com/WANGLEVY9/VidForge/actions/workflows/codeql.yml"><img src="https://github.com/WANGLEVY9/VidForge/actions/workflows/codeql.yml/badge.svg" alt="CodeQL status" /></a>
  <a href="https://github.com/WANGLEVY9/VidForge/actions/workflows/secret-scan.yml"><img src="https://github.com/WANGLEVY9/VidForge/actions/workflows/secret-scan.yml/badge.svg" alt="Secret scan status" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-d6b36a.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-first-3178c6.svg" alt="TypeScript first" />
</p>

<p align="center">
  <a href="https://vid-forge-frontend-nu.vercel.app/">在线预览（部署实例）</a> ·
  <a href="./ROADMAP.md">路线图</a> ·
  <a href="./CONTRIBUTING.md">参与贡献</a> ·
  <a href="./SUPPORT.md">获得帮助</a>
</p>

> VidForge 是独立的社区开源项目，不隶属于 OpenAI、火山引擎、TikTok 或任何其他平台。在线预览依赖独立部署实例；如果实例暂时休眠或未配置后端 Provider，请直接按照下方指南在本地运行。

## 项目愿景

视频生成正在从“单次调用模型”走向“可运营的内容生产系统”。VidForge 希望把这条链路中真正重要、也最容易被 Demo 隐藏的部分开放出来：素材理解、品牌知识、剧本检索、Agent 编排、合规检查、媒体合成、实时任务状态、成本观测和失败回退。

它不是一个只展示 Prompt 的页面，而是一套可以被开发者审阅、替换、测试和自托管的生产型骨架：

```text
商品素材与品牌知识
        ↓
素材理解 → RAG / Memory 检索 → 多 Agent 剧本规划
        ↓                                      ↓
   合规检查 ← 质量评估 ← FFmpeg / TTS / BGM 合成
        ↓
可播放成片 + 证据链 + 成本与延迟 Trace
```

## 为什么值得开源

VidForge 的开源价值不只在于“能生成一条视频”，而在于把 AI 视频产品的关键工程问题变成可以共同改进的公共接口：

| 开源命题   | VidForge 的实现方向                                                        |
| ---------- | -------------------------------------------------------------------------- |
| **可复现** | Docker Compose 本地依赖、数据库 Migration、Provider-neutral 示例与后端测试 |
| **可替换** | ARK、TTS、Embedding、对象存储、队列和 Trace 均通过模块边界隔离             |
| **可解释** | Agent 状态、RAG 命中、长期记忆、质量分数、成本和延迟可进入 Trace           |
| **可运营** | 商品空间隔离、品牌知识飞轮、任务状态、重试、降级和失败回退                 |
| **可共建** | 清晰的文档、路线图、贡献规范、治理文件与面向新贡献者的任务入口             |

当前项目处于积极开发阶段。部分能力需要配置第三方模型或基础设施；README 会明确区分“代码已具备”“需要 Provider”“后续路线”，不以静态 Demo 或虚构指标替代可验证结果。

## 核心能力

### 一条面向生产的创作链路

- **素材理解**：上传图片或视频后，生成商品、画面和剪辑维度的结构化信息，并为后续检索准备 caption / embedding。
- **品牌空间**：为不同商品空间维护卖点、目标人群、品牌语气、自定义词典和高分历史案例。
- **Agent 编排**：Material → Script → Composition → Quality 四个状态节点由 LangGraph 连接；质量未达标时将反馈带回剧本节点重新规划。
- **RAG 剧本生成**：从内置的电商脚本种子库中按品类与风格检索参考内容，保留 RAG 引用，方便审计与后续替换检索器。
- **多分镜视频**：按 Hook / Demo / CTA 等角色组织分镜，调用视频 Provider 后由 FFmpeg 完成拼接、配音、BGM、字幕和导出。
- **实时创作反馈**：通过 Socket.IO 推送任务进度，前端可以看到从创意到成片的状态变化。

### 面向长期使用的工程能力

- **受控长期记忆**：记忆按用户、商品空间和运行任务隔离；召回结果有 Top-K 和字符预算，并以带来源与分数的 Context Packet 注入模型。
- **三层合规链路**：本地规则优先，结合广告与平台风险词检查；必要时再进入模型复核，降低不必要的调用成本。
- **质量与可观测性**：记录 Agent 节点、Provider 调用、FFmpeg 任务、Token、成本、缓存命中率、延迟和最终质量结果。
- **有边界的降级**：Redis 不可用时可退回进程内队列；模型未配置时剧本可走 fallback；局部视频失败不会让整个任务失去可诊断性。
- **安全默认值**：凭证只从环境变量读取，生产环境禁止 TypeORM 自动同步，仓库启用 CI、CodeQL、依赖审查和 secret scan。

## 技术架构

```mermaid
flowchart LR
    U[React 18 创作工作台] --> API[NestJS API]
    U <--> WS[Socket.IO /creation]
    API --> G[LangGraph Agent Runtime]
    G --> M[Material Agent]
    G --> S[Script Agent]
    G --> C[Composition Agent]
    G --> Q[Quality Agent]
    S --> R[RAG Seed Library]
    S --> K[Product Space Knowledge]
    G --> MEM[Scoped Long-term Memory]
    C --> F[FFmpeg / TTS / BGM / Subtitle]
    API --> DB[(PostgreSQL + migrations)]
    API --> REDIS[(Redis / BullMQ / Cache)]
    API --> TRACE[Trace + Cost Observability]
    M --> V[ARK Vision / Embedding]
    S --> T[ARK Text]
    C --> VIDEO[ARK Video Provider]
```

### 技术栈

| 层级           | 选型                                                                 |
| -------------- | -------------------------------------------------------------------- |
| Web 应用       | React 18 · TypeScript · Vite · Ant Design 5 · Zustand · ECharts      |
| API 与领域模块 | NestJS 10 · TypeScript · TypeORM                                     |
| Agent Runtime  | `@langchain/langgraph` StateGraph · 条件分支 · 有界重试 · 自反思回路 |
| 数据与检索     | PostgreSQL · pgvector（可选）· RAG seed library · scoped memory      |
| 媒体流水线     | FFmpeg · BullMQ · Socket.IO · TTS / BGM / 字幕服务                   |
| AI Provider    | 火山方舟 ARK 文本、视觉与视频接口（按环境变量启用）                  |
| 生产部署       | Vercel（前端）· Railway / Nixpacks（后端）· PostgreSQL / Redis       |

## 体验路径

1. **创建商品空间**：定义品牌语气、核心卖点、目标人群和自定义合规词典。
2. **导入商品素材**：上传图片或视频，并运行智能分析获得结构化标签。
3. **生成剧本**：选择品类与风格，系统结合空间知识、RAG 参考和 Agent 反馈生成 Hook / Demo / CTA 分镜。
4. **检查与调整**：查看 RAG 引用、合规结果、质量问题和分镜内容，再进行局部修改或重新生成。
5. **生成成片**：创建视频任务，实时查看进度，等待 Provider 生成和 FFmpeg 后处理完成。
6. **复盘结果**：在 Dashboard 中查看任务结果、Token、估算成本、缓存命中和节点延迟。

## 快速开始

### 环境要求

- Node.js 18 或更高版本（CI 使用 Node.js 20）
- pnpm 8（仓库锁定版本为 `8.15.4`）
- Docker Desktop 或 Docker Engine + Compose
- PostgreSQL 14 或更高版本
- FFmpeg 4 或更高版本（视频合成必需）
- Redis 7 或更高版本（可选；没有 Redis 时会降级为进程内执行）

### 1. 安装依赖并启动本地基础设施

```bash
corepack enable
corepack prepare pnpm@8.15.4 --activate
pnpm install --frozen-lockfile

docker compose up -d
```

Compose 只启动 PostgreSQL / pgvector 与 Redis，不启动应用容器，也不会接触生产凭证。依赖说明见 [`docker/README.md`](./docker/README.md)。

### 2. 配置环境变量

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

本地默认值已经对应 Compose：

```dotenv
# apps/backend/.env
DATABASE_URL=postgresql://vidforge:vidforge-local@localhost:5432/vidforge
REDIS_URL=redis://localhost:6379
WEB_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001

# apps/frontend/.env.local
VITE_API_BASE_URL=http://localhost:3001
```

ARK、TTS、Embedding 和对象存储凭证均为可选配置，但真实的模型生成、语义检索、云端 TTS 或生产级文件持久化需要对应 Provider。任何 `VITE_*` 变量都会进入浏览器产物，不能放入私人凭证。

### 3. 执行迁移并启动应用

```bash
pnpm --filter @vidforge/backend migration:run
pnpm check:env
pnpm dev
```

启动后：

| 服务       | 地址                                                                               |
| ---------- | ---------------------------------------------------------------------------------- |
| 前端工作台 | [`http://localhost:3000`](http://localhost:3000)                                   |
| 后端 API   | [`http://localhost:3001/api`](http://localhost:3001/api)                           |
| Swagger    | [`http://localhost:3001/api/docs`](http://localhost:3001/api/docs)                 |
| Liveness   | [`http://localhost:3001/api/health`](http://localhost:3001/api/health)             |
| Readiness  | [`http://localhost:3001/api/health/ready`](http://localhost:3001/api/health/ready) |

开发环境可以通过 `SEED_DEMO_USER=true` 创建演示账号。公开部署不要启用演示账号，也不要复用仓库中的示例密码。

## Provider 与降级边界

VidForge 可以在没有完整云端 Provider 的情况下完成代码审阅、单元测试、数据库迁移验证和本地媒体 smoke test；但“真实 AI 成片”仍需要配置模型和基础设施。

| 能力     | 无 Provider 时                  | 配置后                                |
| -------- | ------------------------------- | ------------------------------------- |
| 剧本     | 使用内置 fallback，保持接口可用 | ARK 文本模型生成并保留 RAG 引用       |
| 素材理解 | 保留上传与基础流程              | ARK Vision / Embedding 生成语义信息   |
| 视频生成 | 只能运行本地 fixture 或回退路径 | 调用视频模型生成真实分镜              |
| TTS      | 生成静音占位，便于合片验证      | 使用 OpenSpeech / TTS Provider        |
| 队列     | 进程内执行                      | Redis + BullMQ 持久化队列、重试与 DLQ |
| 文件存储 | 本地 `storage/`                 | OSS 等对象存储，支持生产级持久化      |

这一区分是项目设计的一部分：贡献者可以先在无密钥环境中理解和测试系统，再按需要接入 Provider，而不是被凭证或商业 API 阻断。

## API 入口

认证后可以通过 Swagger 查看完整契约。常用入口包括：

| 入口                                               | 用途                        |
| -------------------------------------------------- | --------------------------- |
| `POST /api/auth/register` / `POST /api/auth/login` | 注册与登录                  |
| `GET /api/product-space`                           | 商品空间与品牌知识          |
| `POST /api/material/upload`                        | 上传素材                    |
| `PATCH /api/material/:id/analyze`                  | 运行素材理解                |
| `POST /api/script/generate`                        | 生成带 RAG 与合规结果的剧本 |
| `POST /api/agent/run`                              | 启动多 Agent 全链路任务     |
| `POST /api/creation/task`                          | 创建视频合成任务            |
| `GET /api/creation/task/:id`                       | 查询任务与产物状态          |
| `GET /api/health/ready`                            | 检查服务与数据库就绪状态    |

Provider-neutral 的请求样例位于 [`examples/`](./examples)，不要把真实 token 写进示例或 Issue。

## 项目结构

```text
VidForge/
├── apps/
│   ├── frontend/                 # React/Vite 创作工作台
│   │   ├── src/pages/             # workspace / material / script / creation / dashboard
│   │   ├── src/components/        # storyboard / studio / dashboard / common
│   │   ├── src/services/          # API 与 Socket.IO 客户端
│   │   └── src/store/             # Zustand 状态层
│   └── backend/                  # NestJS API 与媒体服务
│       └── src/modules/
│           ├── agent/             # LangGraph 编排、Memory、Context Packet
│           ├── ai/                # ARK Provider 与响应缓存
│           ├── material/          # 上传、分析、语义检索
│           ├── product-space/     # 品牌知识与空间隔离
│           ├── script/            # 剧本、RAG、合规前置
│           ├── creation/          # 视频任务与实时进度
│           ├── media/             # FFmpeg、TTS、BGM、字幕、存储
│           ├── queue/             # BullMQ 与进程内降级
│           ├── trace/             # Trace、Token、成本与延迟
│           └── compliance/        # 规则与模型复核
├── docs/                         # 架构、部署、运行时与贡献文档
├── examples/                     # 可复现、无凭证的 API 样例
├── docker/                       # 本地基础设施说明
├── .github/                      # CI、CodeQL、依赖审查、secret scan
└── ROADMAP.md                    # 社区路线图
```

## 测试与质量门槛

本地提交前建议按由快到慢的顺序运行：

```bash
# 文档、仓库卫生与仓库级测试
pnpm check:hygiene
pnpm docs:check
pnpm test:repo

# 后端类型检查与测试
pnpm --filter @vidforge/backend build
pnpm test:backend

# 前端构建与全量验证
pnpm --filter @vidforge/frontend lint
pnpm build
pnpm verify
```

CI 会在 Pull Request 和 `main` 推送上执行依赖审计、文档链接检查、仓库卫生检查、Docker Compose 配置校验、测试、前后端 lint、样式检查和构建。CodeQL、依赖审查与 secret scan 独立运行，帮助把安全问题尽量拦在合并之前。

## 部署

推荐将前端和后端拆分部署：

- **Frontend**：Vercel，Root Directory 指向 `apps/frontend`，配置 `VITE_API_BASE_URL` 和可选的 `VITE_WS_URL`。
- **Backend**：Railway 或兼容 Nixpacks 的平台，使用根目录的 `railway.json` / `nixpacks.toml`。
- **Database**：生产 PostgreSQL；启用 pgvector 时使用对应扩展能力。
- **Queue / Cache**：生产环境建议配置 Redis，并使用持久化 BullMQ 队列。
- **Storage**：生产环境建议配置 OSS 或其他对象存储，避免依赖实例本地磁盘。

后端生产环境至少需要：

```dotenv
NODE_ENV=production
DATABASE_URL=...
JWT_SECRET=一个长度至少为 32 个字符的随机密钥
WEB_BASE_URL=https://你的前端域名
API_BASE_URL=https://你的后端域名
```

生产环境不会执行 TypeORM `synchronize`。首次部署和每次 schema 变更都应先执行 migration。完整步骤见 [`docs/生产部署方案.md`](./docs/生产部署方案.md)、[`docs/部署文档.md`](./docs/部署文档.md) 与 [`docker/README.md`](./docker/README.md)。

## Agent、RAG 与 Memory 文档

如果你关心 AI 应用的工程化实现，可以从这些文档开始：

- [`docs/AGENT_RUNTIME.md`](./docs/AGENT_RUNTIME.md)：LangGraph 状态机、重试、质量重规划、长期记忆与 Context Packet。
- [`docs/OBSERVABILITY.md`](./docs/OBSERVABILITY.md)：Trace、Token、成本、延迟与 Provider 调用。
- [`docs/TECHNICAL_ARCHITECTURE.md`](./docs/TECHNICAL_ARCHITECTURE.md)：系统边界与技术决策。
- [`docs/PROVIDER_CONTRACTS.md`](./docs/PROVIDER_CONTRACTS.md)：Provider 能力契约与替换边界。
- [`docs/OPEN_SOURCE_TECH_RADAR.md`](./docs/OPEN_SOURCE_TECH_RADAR.md)：值得跟踪的开源技术方向。
- [`docs/MAINTENANCE_BACKLOG.md`](./docs/MAINTENANCE_BACKLOG.md)：可认领的维护任务。

当前长期记忆检索采用稳定、可测试的 lexical seam；后续可以在不改动媒体管线契约的前提下接入 hybrid retrieval、pgvector、reranker、router 或人工审批节点。

## 如何参与社区

VidForge 欢迎三类贡献：

1. **让核心链路更可靠**：测试、迁移、队列、媒体处理、错误恢复、性能和安全。
2. **让创作体验更好**：信息架构、可访问性、移动端交互、分镜编辑、可观测反馈。
3. **让 AI 能力更可研究**：RAG 评测、Memory 设计、Agent routing、Provider adapter、质量指标和成本控制。

推荐流程：

```bash
git clone https://github.com/WANGLEVY9/VidForge.git
cd VidForge
corepack prepare pnpm@8.15.4 --activate
pnpm install --frozen-lockfile
git checkout -b feat/your-contribution
```

提交 Pull Request 前请阅读 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 和 [`docs/CONTRIBUTOR_QUICKSTART.md`](./docs/CONTRIBUTOR_QUICKSTART.md)。请使用 Conventional Commits，保持每个 PR 聚焦，并在描述中写清楚：问题、设计、验证命令、已知限制和是否需要第三方 Provider。

适合新贡献者的方向可以在 [`docs/CONTRIBUTION_IDEAS.md`](./docs/CONTRIBUTION_IDEAS.md) 和 [`ROADMAP.md`](./ROADMAP.md) 中找到。行为规范见 [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)，项目决策和维护角色见 [`GOVERNANCE.md`](./GOVERNANCE.md)。

## 安全与凭证

请勿提交 API Key、JWT secret、数据库密码、对象存储密钥、个人素材或生产日志。所有凭证必须通过本地 `.env`、部署平台 Secret 或 CI Secret 注入。

如果发现安全问题，请优先阅读 [`SECURITY.md`](./SECURITY.md)，不要在公开 Issue 中粘贴可利用的凭证或完整攻击细节。

## 路线图

项目的下一步围绕四条主线展开：

- **Production**：更稳健的 checkpoint resume、持久化 worker、对象存储与部署可观测性。
- **Intelligence**：hybrid RAG、reranker、Agent router、可评测的 Memory 与质量反馈闭环。
- **Creative UX**：更强的分镜编辑、移动端体验、品牌模板和多平台输出规格。
- **Community**：更完整的 examples、贡献者工具、评测数据集、Provider adapter 和公开技术记录。

详细任务与状态以 [`ROADMAP.md`](./ROADMAP.md) 和 [`CHANGELOG.md`](./CHANGELOG.md) 为准。

## 许可证与商标

VidForge 以 [MIT License](./LICENSE) 发布。VidForge、OpenAI、ARK、TikTok 等名称和标识分别属于其各自权利人；本项目不代表这些组织，也不构成任何商业合作或官方支持关系。

---

<p align="center">
  <sub>Build openly. Measure honestly. Make every generated frame worth keeping.</sub>
</p>
