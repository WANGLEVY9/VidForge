# VidForge — 电商场景 AIGC 带货视频生成系统

## 参赛课题交付文档

> **文档版本**: v2.0 | **提交日期**: 2026-06-06

---

## 一、基础信息

### 1.1 项目名称
VidForge — 电商场景 AIGC 带货视频生成系统

### 1.2 参赛课题
电商场景 AIGC 带货视频生成系统

### 1.3 一句话核心业务价值
帮助电商商家在 TikTok Shop / 抖音等平台零门槛、分钟级生成专业带货视频，打通"素材 → 剧本 → 创作"全链路，实现 AI 驱动的视频营销自动化。

### 1.4 团队成员与分工

| 成员 | 角色 | 负责模块 |
|------|------|----------|
| 王泰杰 | 全栈开发 | 前后端架构、素材/剧本/创作模块、Agent 编排、AI 集成、部署运维 |

---

## 二、功能说明

### 2.1 核心功能清单

| 优先级 | 功能 | 状态 | 说明 |
|--------|------|------|------|
| **P0** | 商品素材上传 | ✅ 已实现 | 支持图片/视频/音频三种类型上传，拖拽交互 |
| **P0** | 剧本生成 | ✅ 已实现 | RAG 增强 + ARK Doubao 模型 + 商品知识注入 |
| **P0** | 基础分镜 | ✅ 已实现 | 分镜列表 + 拖拽排序 + 标题/口播/时长/镜头运动 |
| **P0** | 一键成片 | ✅ 已实现 | Agent 全自动管线 + 快速生成双模式 |
| **P0** | 任务进度 | ✅ 已实现 | WebSocket 实时推送 + REST 轮询双保障 |
| **P0** | 预览导出 | ✅ 已实现 | 在线预览 + MP4/MOV/WebM/GIF + 多种分辨率画幅 |
| **P1** | 素材标签/Embedding 检索 | ✅ 已实现 | 三层标签体系 + 关键词/标签/向量多维度检索 |
| **P1** | 智能剪辑 Agent | ✅ 已实现 | LangGraph 编排：素材分析→剧本→合成→质量评分 |
| **P1** | 分镜级编辑 | ✅ 已实现 | 增删改查、拖拽排序、局部重生成、素材替换 |
| **P1** | TTS/字幕/BGM | ✅ 已实现 | 语音合成 + SRT 字幕烧录 + 风格化 BGM 编配 |
| **P1** | 失败重试 | ✅ 已实现 | 单分镜失败不中断 + 指数退避重试 + 兜底降级 |
| **P1** | 生成过程 trace | ✅ 已实现 | Agent 全链路 span 追踪 + 时序/状态/耗时记录 |
| **P1** | Mock 数据看板 | ✅ 已实现 | 6 张指标卡 + 5 类 ECharts 图表 + 队列监控 |
| **P2** | 多因子归因 | ✅ 已实现 | 风格×状态交叉分析 + 热力图可视化 |
| **P2** | Agent 编排 | ✅ 已实现 | LangGraph StateGraph + 闭环质量反馈 + 自学习 |
| **P2** | A/B 对比 | ✅ 已实现 | 双版本并排播放 + 指标对比表 |
| **P2** | CI/CD | ⚠️ 部分完成 | Railway 部署配置就绪；GitHub Actions CI 待补充 |
| **P2** | 可观测性 | ⚠️ 部分完成 | 健康检查 + 日志 + Trace 追踪；日志聚合待完善 |
| **P2** | 长任务体验 | ✅ 已实现 | WebSocket 实时进度 + 断点续创 + 失败清晰反馈 |
| **P2** | 合规审核流 | ✅ 已实现 | 广告法/医疗/夸大用语/平台规则/自定义词库全覆盖 |

### 2.2 端到端使用流程

1. **商家登录系统**，进入工作空间，在素材页面上传商品主图、视频素材和参考素材，AI 自动分析并生成三层结构化标签（商品维度/视频维度/切片维度）
2. **切换至剧本页面**，填写商品名称、品类、卖点、目标人群，选择视频风格和时长，点击生成 → 系统自动检索爆款参考视频并注入商品知识，调用 ARK Doubao 模型生成含 3 个分镜（hook/demo/cta）的完整剧本
3. **系统生成剧本后**，展示分镜脚本列表，包含画面描述、镜头运动、口播台词、字幕、BGM 建议和合规检查结果；用户可复制剧本到剪贴板或直接传递给创作模块
4. **进入视频创作页面**，系统自动基于剧本生成完整分镜板，每个分镜包含独立参数；用户可拖拽排序、编辑口播、调整时长、替换素材、删除或新增分镜
5. **点击"AI 一键成片"**，Agent 管线自动执行：素材检索评分 → 剧本生成（带自反思）→ 视频分镜生成（ARK Seedance）→ FFmpeg 合成（合片+TTS+BGM+字幕）→ 质量多维评分
6. **视频生成过程中**，WebSocket 实时推送总体进度和每个分镜的独立进度；异常时自动重试并给出清晰错误提示
7. **生成完成后**，用户可在线预览完整视频，也可逐个分镜下载；进入导出面板选择 MP4/MOV/WebM/GIF 格式、480p~4K 分辨率、竖屏/横屏/方形画幅，提交导出任务
8. **回到数据看板**，查看生产统计、趋势分析、Agent 任务分布、模型性能对比、因子归因矩阵和 AI 调用成本概览，持续优化创作策略

---

## 三、交付材料

### 3.1 在线 Demo 链接

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端页面 | https://vid-forge-frontend-nu.vercel.app | 可直接访问 |
| 后端 API | https://vid-forge-backend.up.railway.app/api | 健康检查 `/api/health` |
| Swagger 文档 | https://vid-forge-backend.up.railway.app/api/docs | 全接口文档 |

> 体验账号：需注册使用 / 可联系团队提供测试账号

### 3.2 演示视频链接

<!-- 【待补充】演示视频链接 — 建议上传到 B站/YouTube -->

### 3.3 源代码仓库链接

| 仓库 | 地址 |
|------|------|
| GitHub (主仓库) | https://github.com/WANGLEVY9/VidForge |
| 分支 | `main` (默认分支) |
| 最后提交 | `9aa965d` — 更新 Doubao API Key |

### 3.4 README / 运行说明

详见项目根目录 `README.md` 及本文档后续技术说明章节。

---

## 四、技术说明

### 4.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                       用户浏览器 (React SPA)                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │素材页│ │剧本页│ │创作页│ │看板  │ │A/B  │ │导出  │           │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │
│    ┌─────────────── Zustand 状态管理 ───────────────┐              │
│    │  Socket.IO 实时通信 / REST API 调用             │              │
│    └─────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                           │ HTTP / WSS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   NestJS API 服务 (Railway)                         │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐   │
│  │ 素材模块 │ │ 剧本模块 │ │ 创作模块 │ │ Agent 编排           │   │
│  │ 上传/分析 │ │ 生成/RAG │ │ 队列/合片 │ │ LangGraph 管线      │   │
│  │ 检索/标签 │ │ 合规/爆款 │ │ 进度/编辑 │ │ 素材→剧本→合成→质量 │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐   │
│  │ 导出模块 │ │ 分析看板 │ │ 合规审核 │ │ AI 服务层            │   │
│  │ transcode│ │ ECharts  │ │ 违禁词库 │ │ ARK / TTS / Embed    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘   │
│                                                                     │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────────┐  │
│  │  PostgreSQL   │ │    Redis      │ │   FFmpeg 媒体处理          │  │
│  │  + pgvector   │ │  BullMQ/缓存  │ │   合片/转码/字幕/BGM      │  │
│  └───────────────┘ └───────────────┘ └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   火山引擎 ARK API (外部)                            │
│  Doubao-Seed-2.0-pro (文本生成/视觉理解)                             │
│  Doubao-Seedance-1.5-pro (视频生成)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 核心技术栈

| 层次 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **前端** | React | 18.x | UI 框架 |
| | TypeScript | 5.x | 类型安全 |
| | Vite | 5.x | 构建工具 |
| | Ant Design | 5.x | 组件库 |
| | ECharts | 5.x | 数据可视化 |
| | Zustand | 4.x | 状态管理 |
| | Socket.IO Client | 4.x | 实时通信 |
| | @dnd-kit | 6.x | 拖拽交互 |
| **后端** | NestJS | 10.x | Node.js 框架 |
| | TypeScript | 5.x | 类型安全 |
| | TypeORM | 0.3.x | ORM |
| | PostgreSQL | 14+ | 关系数据库 |
| | pgvector | - | 向量检索 |
| | Redis | 7+ | 缓存/队列/PubSub |
| | BullMQ | 5.x | 任务队列 |
| | Socket.IO | 4.x | WebSocket |
| | LangChain/LangGraph | 1.x | Agent 编排 |
| | FFmpeg | 5+ | 媒体处理 |
| **AI** | 火山方舟 Doubao-Seed-2.0-pro | - | 文本生成/视觉理解 |
| | 火山方舟 Doubao-Seedance-1.5-pro | - | 视频生成 |
| | BGE-M3 (Ollama) | - | 文本嵌入（可选） |
| **部署** | Railway | - | 后端托管 |
| | Vercel | - | 前端托管 |
| | pnpm | 8+ | 包管理器 |

### 4.3 大模型 / AI 能力使用说明

#### 使用的模型与 API

| 模型/API | 用途 | 集成位置 | 调用方式 |
|----------|------|----------|----------|
| Doubao-Seed-2.0-pro | 剧本生成 | `ArkTextService.chatCompletion()` → `ScriptService.generate()` | Chat Completion API |
| Doubao-Seed-2.0-pro (多模态) | 素材视觉理解与标签生成 | `ArkVisionService.understandImage()` → `MaterialService.analyzeTags()` | Chat Completion (多模态) |
| Doubao-Seed-2.0-pro | Agent 质量评分 | `QualityAgent` → ARK text model for consistency/hook scoring | Chat Completion |
| Doubao-Seed-2.0-pro | Self-reflection 循环 | `ScriptAgent` → injects quality feedback into next iteration | Chat Completion |
| Doubao-Seedance-1.5-pro | 视频分镜生成 | `ArkVideoService.createTask()` → per-shot generation | 异步任务 API + 轮询 |
| BGE-M3 (Ollama) | 素材向量嵌入 | `MaterialService.semanticSearch()` → embedding generation | HTTP API (可选) |

#### Prompt 策略

- **剧本生成 Prompt**: 系统角色定义为电商视频脚本专家，强制输出结构化 JSON（含 narrative framework、shots、voiceover、bgm），注入禁止词约束。用户部分包含商品信息。RAG 增强：从种子库检索 top-2 同类目同风格爆款作为 few-shot。知识注入：商品空间中的卖点、人群、品牌调性、最佳实践。
- **视觉理解 Prompt**: 结构化 JSON 输出，三类标签枚举受控（品类限定 8 类、情绪限定 6 类、适用性限定 5 类），强制三维标签体系。
- **质量评分 Prompt**: 多维度评分（完整性、时长、一致性、合规性、钩子强度），LLM 评估一致性 + 钩子强度，词典确定性检查合规性。
- **Agent 自反思**: 质量 Agent 的反馈注入到下一轮 Composition Agent 的 prompt，形成闭环优化。

#### Agent / RAG / 向量方案

- **Agent 编排**: LangGraph `StateGraph` 四节点管线（Material → Script → Composition → Quality），条件边支持质量不达标重试（最多 2 次），self-reflection 循环。
- **RAG 检索增强**: 剧本生成时，通过品类+风格匹配从种子爆款库中检索 top-K 作为 few-shot 示例。
- **向量检索**: pgvector 扩展提供 cosine 相似度搜索（`<=>` 运算符），用于素材语义检索。回退：PostgreSQL `ILIKE` 文本搜索。

### 4.4 关键工程难点与解决方案

#### 难点 1：视频生成长耗时任务的进度跟踪与容错

**挑战**: 视频生成涉及 ARK 异步任务（每分镜 30-120s）+ FFmpeg 合片（10-30s），全程可能 3-5 分钟，需实时进度反馈、异常重试、部分失败降级。

**解决方案**：
- 双通道进度通信：Socket.IO WebSocket 推送优先 + REST 轮询兜底，`terminalRef` 防重复处理
- 分镜级失败隔离：单个分镜生成失败不影响其他分镜，失败分镜回退到文案提示生成的纯色底片
- 指数退避重试：ARK 异步任务轮询失败时以 4s 间隔指数退避
- FFmpeg 分级降级：合成失败 → 回退到第一分镜视频；字幕烧录失败 → 返回无字幕版本

#### 难点 2：多模型 API 的整合与可用性保障

**挑战**: 依赖外部模型 API（ARK），存在限流、鉴权失效、网络波动等不可控因素，直接影响核心流程。

**解决方案**：
- 三层 API Key 配置：环境变量 > 代码内置 > 黑名单兜底，`KNOWN_DEAD_KEYS` 自动跳过已知失效 key
- 全链路降级策略：ARK 不可用时，剧本生成回退到模板化兜底；视频生成回退到文案提示
- 一键诊断端点：`GET /api/ai/ark/diagnose` 对所有模型/Ping/鉴权/连通性做健康检测，前端可视化
- 黑名单自动降级：Railway 环境变量残留旧 key 时，命中黑名单自动回落到内置新 key，部署无需手动更新

#### 难点 3：复杂的分镜级编辑交互

**挑战**: 分镜列表 + 时间轴需要拖拽排序、增删复制、局部刷新、快捷键，且需避免重渲染整片

**解决方案**：
- Zustand 纯客户端状态：分镜 CRUD 全部在 store 中完成，API 调用仅在"开始生成"时触发
- @dnd-kit 可排序列表：支持鼠标/触摸拖拽，CSS transform 动画不触发重排
- 分镜级独立渲染：每个 `ShotItem` 通过 `React.memo` + 稳定 key 独立更新
- 快捷键系统：Cmd+S 保存 / Ctrl+Shift+P 预览 / Cmd+D 复制分镜

#### 难点 4：Agent 编排的闭环质量控制

**挑战**: AI 生成的视频质量不可预知，需自动评估并触发重做，同时保持管线可观测。

**解决方案**：
- LangGraph StateGraph 状态机：四节点管线 + 条件边（quality < 阈值 → 重做）
- 自反思循环：质量 Agent 的结构化反馈（完整性/时长/一致性/合规性/钩子）注入下一轮 prompt
- 自学习飞轮：高质量结果（得分 ≥ 85）写入商品空间知识库，后续生成作为 few-shot 参考
- Trace 全链路追踪：每个 Agent span 包含 `{ span, startedAt, endedAt, latencyMs, status, summary }`，存入数据库供分析

### 4.5 部署与访问说明

#### 部署架构

```
Vercel (前端 SPA)  ←── HTTPS ──→  Railway (后端)

Railway 服务：
  ├── NestJS API Server
  ├── PostgreSQL 14 Database
  └── Redis 7 Cache/Queue
```

#### 访问方式

1. **直接访问**：https://vid-forge-frontend-nu.vercel.app
2. **注册/登录**：使用邮箱注册账号
3. **创建工作空间**：登录后自动创建默认工作空间
4. **全流程体验**：素材上传 → 剧本生成 → 视频创作 → 导出下载

#### 本地开发启动

```bash
# 前置依赖：Node.js 18+, pnpm 8+, PostgreSQL 14+, Redis 7+, FFmpeg 5+

# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp apps/backend/.env.example apps/backend/.env
# 编辑 .env 填入数据库连接等配置

# 3. 启动服务（前后端同时启动）
pnpm dev

# 4. 访问
# 前端：http://localhost:3000
# 后端 API：http://localhost:3001/api
# Swagger：http://localhost:3001/api/docs
```

---

## 五、结果说明

### 5.1 项目完成度

**可用 Demo / 接近生产级版本**

- ✅ 所有 P0 必做功能：100% 完成
- ✅ 所有 P1 进阶功能：100% 完成
- ✅ 大多数 P2 加分功能：已实现（CI/CD 管线及生产级可观测性待完善）
- ✅ 端到端链路已跑通，可直接运行体验
- ✅ 已部署到公网，评委可直接访问

### 5.2 项目亮点 / 创新点

**亮点一：Agent 驱动的全自动生产管线 + 闭环质量反馈 + 自学习飞轮**

不只是简单的 API 调用链，而是基于 LangGraph 实现了完整的 Agent 编排系统：
- 四节点管线自动执行素材检索 → 剧本生成 → 视频合成 → 质量评估
- 质量不满足阈值时自动重做并注入反馈（self-reflection）
- 高质量结果自动沉淀为知识，后续生成持续优化（self-learning）

**亮点二：RAG 增强的智能剧本生成，融合爆款分析 + 商品知识 + 合规审核**

剧本生成并非单一 prompt 调用，而是综合了：
- 基于品类+风格的爆款参考视频检索（RAG few-shot）
- 商品空间知识注入（卖点、人群、品牌调性、最佳实践）
- 生成后自动化合规审核（广告法/医疗/夸大/平台规则/自定义词库）
- ARK 不可用时无缝回退模板化兜底

**亮点三：全链路降级设计，确保系统在任何情况下的可用性**

每个外部依赖都有降级方案：
- API Key 黑名单自动回退 → 部署时零手动配置
- Redis 不可用 → in-process 模式降级
- ARK 模型不可用 → 模板/启发式降级
- pgvector 不可用 → ILIKE 文本搜索降级
- TTS 不可用 → 静音占位音频
- WebSocket 不可用 → REST 轮询兜底

---

## 六、选填项

### 6.1 产品截图 / 页面图集

<!-- 【待补充】关键页面截图 -->
- 素材管理页面（网格/列表视图 + 上传交互）
- 剧本生成页面（配置表单 + 分镜结果 + 合规报告）
- 视频创作页面（分镜编辑器 + 预览播放器 + 时间轴）
- 数据看板（6 张指标卡 + 5 类 ECharts 图表）
- A/B 对比页面（并排双播放器 + 指标对比表）
- 导出面板（格式/分辨率/画幅选择 + 任务历史）

### 6.2 接口文档 / API 清单

完整 API 清单详见 Swagger 文档：
- 生产环境：https://vid-forge-backend.up.railway.app/api/docs

核心接口一览：

| 模块 | 方法 | 路径 | 功能 |
|------|------|------|------|
| AI | GET | `/api/ai/health` | AI 服务健康检查 |
| AI | GET | `/api/ai/ark/configs` | ARK 配置列表 |
| AI | POST | `/api/ai/ark/chat` | 文本对话 |
| AI | POST | `/api/ai/ark/video/generate` | 创建视频生成任务 |
| AI | GET | `/api/ai/ark/video/task/:id` | 查询视频任务状态 |
| Material | GET | `/api/material` | 素材列表 |
| Material | POST | `/api/material` | 创建素材 |
| Material | POST | `/api/material/:id/analyze` | 触发 AI 分析 |
| Material | GET | `/api/material/search/tags` | 标签搜索 |
| Material | POST | `/api/material/semantic-search` | 语义搜索 |
| Script | POST | `/api/script/generate` | 剧本生成 |
| Script | GET | `/api/script` | 剧本列表 |
| Script | GET | `/api/script/:id` | 剧本详情 |
| Creation | POST | `/api/creation/task` | 创建视频任务 |
| Creation | GET | `/api/creation/task` | 任务列表 |
| Creation | PATCH | `/api/creation/task/:id/shot` | 重新生成分镜 |
| Creation | GET | `/api/creation/task/:id/progress` | 查询任务进度 |
| Agent | POST | `/api/agent/run` | 运行 Agent 管线 |
| Agent | GET | `/api/agent/status/:runId` | 查询 Agent 状态 |
| Agent | POST | `/api/agent/cancel/:runId` | 取消 Agent 运行 |
| Export | POST | `/api/export` | 创建导出任务 |
| Export | GET | `/api/export` | 导出任务列表 |
| Analytics | GET | `/api/analytics/overview` | 概览数据 |
| Analytics | GET | `/api/analytics/trends` | 趋势数据 |
| Analytics | GET | `/api/analytics/distribution` | 分布数据 |
| Analytics | GET | `/api/analytics/attribution` | 归因分析 |
| Analytics | GET | `/api/analytics/traces` | 追踪数据 |

### 6.3 Prompt 策略 / Agent 流程图

#### Agent 流程图

```
                          ┌──────────────┐
                          │   User Input  │
                          │ (商品/风格/   │
                          │  时长/素材)   │
                          └──────┬───────┘
                                 ▼
                          ┌──────────────┐
                    ┌─────┤ Orchestrator ├─────┐
                    │     └──────┬───────┘     │
                    │            ▼             │
                    │   ┌──────────────┐      │
                    │   │  Material    │      │
                    │   │  Analysis    │      │
                    │   └──────┬───────┘      │
                    │            ▼             │
                    │   ┌──────────────┐      │
                    │   │   Script     │      │
                    │   │  Generation  │      │
                    │   └──────┬───────┘      │
                    │            ▼             │
                    │   ┌──────────────┐      │
                    │   │ Composition  │◄─────┤ (retry)
                    │   │  (Video)     │      │ if quality < threshold
                    │   └──────┬───────┘      │
                    │            ▼             │
                    │   ┌──────────────┐      │
                    │   │   Quality    ├──────┤
                    │   │   Check      │      │
                    │   └──────┬───────┘      │
                    │            ▼             │
                    │   ┌──────────────┐      │
                    │   │   Learn      │      │
                    │   │ (score>=85)  │      │
                    │   └──────┬───────┘      │
                    │            ▼             │
                    │   ┌──────────────┐      │
                    └──►│   Return     │      │
                        │   Result     │      │
                        └──────────────┘      │
                                               │
                        ┌──────────────┐       │
                        │  ProductSpace│◄──────┘
                        │  Knowledge   │  (bestPractices)
                        └──────────────┘
```

#### 核心 Prompt 结构

**剧本生成系统 Prompt（简化）**:
```
你是一位电商带货视频脚本专家。根据提供的商品信息生成一条高质量带货视频剧本。

【任务要求】
1. 输出严格 JSON 格式
2. 包含3个分镜：Hook(吸引停留) → Demo(展示卖点) → CTA(引导转化)
3. 每个分镜包含：画面描述、镜头运动、口播文案、字幕、时长、类型
4. 总时长不超过15秒
5. 禁止出现：《广告法》极限词、医疗承诺、夸大用语
6. 语音风格、BGM风格、字幕位置由你推荐

【输出结构】
{
  "title": "视频标题",
  "shots": [{ "index": 1, "duration": 5, "description": "...", "voiceover": "...", "caption": "...", "cameraMovement": "推镜", "type": "hook" }],
  "voiceover": { "style": "活力", "speed": "normal" },
  "bgmSuggestion": { "style": "动感", "mood": "欢快" },
  "tags": ["卖点1", "卖点2"]
}
```

### 6.4 开发里程碑 / 版本迭代记录

| 日期 | 版本 | 主要变更 |
|------|------|----------|
| 2026-05-20 | v0.1 | 项目启动，技术方案规划，基建初始化 |
| 2026-05-21 | v0.5 | 前后端基础架构搭建，P0 功能完成（素材/剧本/创作全链路） |
| 2026-05-22 | v1.0 | 生产部署方案，Railway/Vercel 配置，健康检查 |
| 2026-05-24 | v1.5 | V2 核心升级：真实视频管线、Agent 编排、可观测、合规 |
| 2026-05-31 | v2.0 | 失效 key 黑名单兜底、打包优化、多轮深度优化 |
| 2026-06-01 | v2.1 | 顶栏体验完善（通知中心/API 配置中心/浅色模式） |
| 2026-06-06 | v2.2 | API Key 更新、交付文档整理、docs 重构 |

---

## 七、附录：当前项目待改进 / 未完成项

基于本次全面审计，以下是识别出的待优化项，按优先级排列：

### P0 优先级（影响核心功能）

| # | 问题 | 模块 | 影响 | 建议修复 |
|---|------|------|------|----------|
| 1 | Agent 编排 `retryCount` 未递增 | Agent | 质量 < 阈值时可能无限循环 | `orchestrator.service.ts` 条件边中增加 `retryCount++` |
| 2 | Material 实体缺少 `embedding` 列 | Material | 语义搜索端到端不可用 | 添加 `ALTER TABLE` 迁移 + TypeORM 列定义 |
| 3 | 后端无文件上传端点（base64 存 db） | Material | 大文件不可用，数据库膨胀 | 集成 multer + 对象存储（OSS/TOS） |
| 4 | 视频素材缺少多模态理解 | Material | 视频只能用启发式标签 | 集成 FFmpeg 抽帧 → 逐帧 ARK 视觉理解 |

### P1 优先级（体验完善）

| # | 问题 | 模块 | 影响 | 建议修复 |
|---|------|------|------|----------|
| 5 | 前端标签搜索 UI 缺失 | Material | 用户无法使用标签搜索 | 连接 `searchByTags` API 到前端控件 |
| 6 | 排序选择器无效 | Material | 排序选项为纯展示 | 添加 `orderBy` API 参数支持 |
| 7 | 素材入库分析队列处理器为空 | Material | 队列分析不生效 | 填充 `MaterialAnalyzeProcessor` |
| 8 | AnalyticsModule 缺少 `QueueRunnerModule` 导入 | Analytics | 注入失败 | 在 `analytics.module.ts` imports 中添加 |
| 9 | 趋势视频库前端未连接 | Script | `inspire` 接口定义但用户不可见 | 添加前端页面/组件展示爆款库 |

### P2 优先级（加分 / 完善）

| # | 问题 | 模块 | 影响 | 建议修复 |
|---|------|------|------|----------|
| 10 | CI Pipeline 缺失 | DevOps | 无自动 lint/test/build | 配置 GitHub Actions |
| 11 | Husky 未初始化 | DevOps | 预提交钩子不触发 | `npx husky init` 创建 pre-commit |
| 12 | A/B 对比按钮无操作 | Frontend | "采纳"/"另存为"无功能 | 添加点击处理 |
| 13 | 灵感模板系统完全缺失 | Script | 无模板实体/页面 | 后续迭代增加 |
| 14 | 移动端布局被禁用 | Frontend | `isMobile: false` 硬编码 | 启用响应式断点检测 |
| 15 | 剧本页面缺少干预能力 | Script | 分镜编辑仅在创作页面可用 | 添加分镜编辑组件到剧本页面 |
| 16 | `activeRuns` abort 信号未传递 | Agent | 不能真正中断运行 | 传递 AbortController 信号 |
| 17 | 无 PWA 支持 | Frontend | 无离线能力 | 添加 Service Worker + manifest |
| 18 | 无全局快捷键注册表 | Frontend | 快捷键仅限故事板编辑器 | 抽取全局快捷键系统 |

---

> **文档版本**: v2.0
> **提交日期**: 2026-06-06
> **项目仓库**: https://github.com/WANGLEVY9/VidForge
> **在线体验**: https://vid-forge-frontend-nu.vercel.app
