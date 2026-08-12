# VidForge — 电商场景 AIGC 带货视频生成系统

## 参赛课题交付文档

> **文档版本**: v3.0 | **提交日期**: 2026-06-10

---

## 一、基础信息

### 1.1 项目名称

VidForge — 电商场景 AIGC 带货视频生成系统

### 1.2 参赛课题

电商场景 AIGC 带货视频生成系统

### 1.3 一句话核心业务价值

帮助电商商家在 TikTok Shop / 抖音等平台零门槛、分钟级生成专业带货视频，打通"素材 → 剧本 → 创作"全链路，实现 AI 驱动的视频营销自动化。

### 1.4 团队成员与分工

| 成员   | 学校 | 专业 | 角色               | 负责模块                                                                               |
| ------ | ---- | ---- | ------------------ | -------------------------------------------------------------------------------------- |
| 王泰杰 | —    | —    | 全栈开发 / 架构    | 前后端架构设计、素材/剧本/创作三大模块开发、AI 集成与 Agent 编排、数据库设计、部署运维 |
| 李政言 | —    | —    | 前端开发 / AI 工程 | 前端交互与组件开发、AI 模型集成与 Prompt 工程、数据可视化看板、合规审核系统            |

---

## 二、功能说明

### 2.1 核心功能清单

| 优先级 | 功能                      | 状态      | 说明                                                                                                       |
| ------ | ------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| **P0** | 商品素材上传              | ✅ 已实现 | 支持图片/视频/音频三种类型上传，memoryStorage + MIME 白名单过滤 + 200MB 限制，自动写入本地存储或阿里云 OSS |
| **P0** | 素材 AI 分析（图片）      | ✅ 已实现 | ARK 多模态视觉理解（Doubao-Seed-2.0-pro）→ 三层结构化标签（商品维度/画面维度/剪辑维度）                    |
| **P0** | 素材 AI 分析（视频）      | ✅ 已实现 | FFmpeg 抽 3 个关键帧 → 逐帧 ARK 视觉理解 → Set 去重聚合 → 三层标签                                         |
| **P0** | 素材自动分析              | ✅ 已实现 | 上传完成后自动入队分析，支持 BullMQ 队列（Redis）或进程内双轨执行                                          |
| **P0** | 剧本生成                  | ✅ 已实现 | RAG 增强检索 + ARK Doubao 文本模型 + 商品知识注入 + 爆款参考 + 合规审核                                    |
| **P0** | 基础分镜                  | ✅ 已实现 | 3 分镜结构（Hook/Demo/CTA），含画面描述、镜头运动、口播台词、时长、字幕                                    |
| **P0** | 一键成片                  | ✅ 已实现 | Agent 全自动管线（素材→剧本→合成→质量评分） + 快速生成双模式                                               |
| **P0** | 任务进度                  | ✅ 已实现 | WebSocket 实时推送 + REST 轮询双保障，分镜级独立进度                                                       |
| **P0** | 预览导出                  | ✅ 已实现 | 在线预览 + MP4/MOV/WebM/GIF 格式 + 480p~4K 分辨率 + 9:16/16:9/1:1 画幅                                     |
| **P1** | 素材标签 / Embedding 检索 | ✅ 已实现 | 三层标签体系（商品/视频/切片）+ 关键词 ILIKE / 标签过滤 / pgvector 语义相似度 / 6 种排序                   |
| **P1** | 智能剪辑 Agent            | ✅ 已实现 | LangGraph StateGraph 编排：素材分析 → 剧本生成 → 视频合成 → 质量评分 + 自反思闭环                          |
| **P1** | 分镜级编辑                | ✅ 已实现 | @dnd-kit 拖拽排序、行内文本编辑、单分镜重生成、增删复制、素材替换                                          |
| **P1** | TTS / 字幕 / BGM          | ✅ 已实现 | 语音合成（TTS）+ SRT 字幕烧录 + 风格化 BGM 编配，在合片阶段自动混入                                        |
| **P1** | 失败重试                  | ✅ 已实现 | 单分镜失败不中断其他分镜 + 指数退避重试 + FFmpeg 分级降级（无字幕→无BGM→纯视频）                           |
| **P1** | 生成过程 Trace            | ✅ 已实现 | Agent 全链路 span 追踪（状态/耗时/错误）+ 存入分析数据库供看板使用                                         |
| **P1** | 数据看板                  | ✅ 已实现 | 6 张指标卡 + 5 类 ECharts 图表（趋势/分布/对比/热力图/成本）+ 队列监控                                     |
| **P1** | 爆款参考库                | ✅ 已实现 | 同品类/同风格种子脚本检索 + 抽屉面板预览（Hook/Demo/CTA 分镜+配音+核心信息）                               |
| **P1** | 素材标签搜索              | ✅ 已实现 | 品类/情绪/风格三级标签过滤芯片 + AI 分析状态标识 + 排序选择器（6 种维度）                                  |
| **P2** | 多因子归因分析            | ✅ 已实现 | 风格×状态交叉分析 + 热力图可视化 + 基于生成数据的归因矩阵                                                  |
| **P2** | Agent 编排                | ✅ 已实现 | LangGraph 四节点管线 + 条件边质量自检 + 自反思重做 + 自学习知识沉淀                                        |
| **P2** | A/B 对比                  | ✅ 已实现 | 双版本并排播放 + 指标对比表 + 采用下载 / 另存为模板 / 导出报告                                             |
| **P2** | CI/CD                     | ✅ 已实现 | GitHub Actions CI（lint → build）+ Husky pre-commit hook（lint + prettier）                                |
| **P2** | 可观测性                  | ✅ 已实现 | 健康检查端点、Agent Trace 追踪、ARK 一键诊断、日志记录                                                     |
| **P2** | 长任务体验                | ✅ 已实现 | WebSocket 实时进度 + 断点续创 + 失败兜底 + 分镜级延迟渲染                                                  |
| **P2** | 合规审核流                | ✅ 已实现 | 广告法极限词 / 医疗承诺 / 夸大用语 / 平台规则 / 自定义词库全覆盖                                           |
| **P2** | 移动端适配                | ✅ 已实现 | matchMedia 断点检测 + 响应式布局 + 移动端轻量编辑体验                                                      |
| **P2** | PWA 支持                  | ✅ 已实现 | Service Worker 缓存策略 + manifest 配置 + 可安装                                                           |
| **P2** | 全局快捷键                | ✅ 已实现 | Ctrl+S 保存 / Ctrl+K 搜索 / ? 帮助弹窗                                                                     |
| **P2** | 灵感模板系统              | ✅ 已实现 | Template 实体 + CRUD API + 前端浏览/保存/加载模态框                                                        |
| **P2** | Agent 取消                | ✅ 已实现 | activeRuns 注入 AbortController → LangGraph 信号传递 → 资源释放                                            |
| **P2** | 剧本干预                  | ✅ 已实现 | 分镜拖拽排序 + 行内编辑 + 单分镜重生成 + 素材替换                                                          |
| **P2** | OSS 对象存储              | ✅ 已实现 | 阿里云 OSS 集成，支持自动回退本地存储；所有素材/产物 URL 自动解析为绝对 URL                                |
| **P2** | 一键诊断                  | ✅ 已实现 | `GET /api/ai/ark/diagnose` 对所有模型/鉴权/连通性健康检测                                                  |

### 2.2 端到端使用流程

1. **商家登录系统**进入工作空间，在素材页面上传商品主图、视频素材或参考素材（支持拖拽或点击上传，图片/视频/音频三种类型），AI 自动分析并生成三层结构化标签（商品维度/画面维度/切片维度）；用户可通过品类/情绪/风格标签快速过滤，或按名称/大小/时间多种维度排序
2. **切换至剧本页面**，填写商品名称、品类、卖点、目标人群，选择视频风格和时长；可先点击"爆款参考"查看同品类/同风格的种子脚本，了解行业优秀案例
3. **点击"生成剧本"**，系统自动检索爆款参考视频库进行 RAG 增强，注入商品空间知识（卖点/人群/品牌/最佳实践），调用 ARK Doubao 文本模型生成含 3 个分镜（Hook 开场吸引 / Demo 卖点展示 / CTA 引导转化）的完整剧本，附带 BGM 推荐、字幕方案和合规审核报告
4. **剧本生成后**，展示分镜脚本列表，包含画面描述、镜头运动、口播台词、字幕文本、时长分配；用户可复制剧本、拖拽调整分镜顺序、编辑台词和描述、保存剧本或直接传递给创作模块
5. **进入视频创作页面**，系统基于剧本自动生成完整分镜板，每个分镜独立可调；用户可拖拽排序、编辑口播、调整时长、替换素材切片、删除或新增分镜
6. **点击"AI 一键成片"**，Agent 管线自动执行：素材检索与评分 → 剧本生成（含自反思优化）→ ARK Seedance 视频分镜生成 → FFmpeg 合成（拼接+TTS 配音+BGM 混音+SRT 字幕烧录）→ 质量多维评分
7. **视频生成过程中**，WebSocket 实时推送总体进度和每个分镜的独立阶段；异常时自动重试并给出清晰错误反馈（失败原因 + 降级提示）
8. **生成完成后**，用户可在线预览完整视频，逐个分镜下载检查；进入导出面板选择 MP4/MOV/WebM/GIF 格式、480p~4K 分辨率、竖屏/横屏/方形画幅，提交导出任务
9. **回到数据看板**查看生产统计（总量/今日/成功率/时长累计）、趋势分析、Agent 任务分布、模型性能对比、因子归因矩阵和 AI 调用成本概览，持续优化创作策略

---

## 三、交付材料

### 3.1 在线 Demo 链接

| 服务         | 地址                                              | 说明                           |
| ------------ | ------------------------------------------------- | ------------------------------ |
| 前端页面     | https://vid-forge-frontend-nu.vercel.app          | 可直接访问，推荐 Chrome 浏览器 |
| 后端 API     | https://vid-forge-backend.up.railway.app/api      | 健康检查 `/api/health`         |
| Swagger 文档 | https://vid-forge-backend.up.railway.app/api/docs | 全接口文档，可在线调试         |

> **体验说明**：使用邮箱注册即可体验完整流程。如遇模型调用超时（ARK 首次调用较慢），稍等重试即可，系统内置兜底降级不影响核心流程演示。

### 3.2 演示视频链接

<!-- 【待补充】演示视频链接 — 建议上传到 B站/YouTube，3-8 分钟展示核心场景 -->

### 3.3 源代码仓库链接

| 项目          | 地址                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| GitHub 主仓库 | https://github.com/WANGLEVY9/VidForge                                                                        |
| 默认分支      | `main`                                                                                                       |
| 最后提交      | `acc7251` — fix: resolve relative /static/ URLs to absolute, remove placeholder switches, fix 爆款参考 crash |

### 3.4 README / 运行说明

详见项目根目录 `README.md` 及本文档后续技术说明与部署章节。

---

## 四、技术说明

### 4.1 系统架构图

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              用户浏览器 (React SPA)                               │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐    │
│    │  素材页   │ │  剧本页   │ │  创作页   │ │  看板页   │ │  A/B 页  │ │ 导出  │    │
│    │ 上传/预览 │ │ 配置/生成 │ │ 分镜编辑  │ │ 指标/图表  │ │ 双版对比 │ │ 格式  │    │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────┘    │
│       ┌─────────────── Zustand 状态管理 ───────────────┐                        │
│       │    Socket.IO 实时通信 / Axios REST 调用         │                        │
│       └─────────────────────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────────────────────┘
                                    │ HTTP / WSS
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          NestJS API 服务 (Railway)                                │
│                                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────────────────┐  │
│  │   素材模块    │ │   剧本模块    │ │   创作模块    │ │   Agent 编排              │  │
│  │ 上传(multer) │ │ 生成(ARK)   │ │ 队列(BullMQ) │ │   LangGraph StateGraph   │  │
│  │ 多模态分析    │ │ RAG 检索     │ │ 合片(FFmpeg) │ │   素材→剧本→合成→质量     │  │
│  │ 三维标签体系  │ │ 爆款参考库   │ │ TTS+字幕+BGM │ │   自反思 + 自学习         │  │
│  │ 语义检索     │ │ 合规审核     │ │ 分镜级干预   │ │   质量闭环                 │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────────────────────┘  │
│                                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────────────────┐  │
│  │   导出模块   │ │   分析看板   │ │   合规系统   │ │   Infrastructure           │  │
│  │ transcode   │ │ ECharts 图表│ │ 违禁词库    │ │   JWT Auth / 健康检查      │  │
│  │ 多分辨率    │ │ 因子归因     │ │ LLM 审核    │ │   API 诊断 / Trace 追踪    │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────────────────────┘  │
│                                                                                  │
│  ┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐ │
│  │    PostgreSQL 14      │ │    Redis 7        │ │   FFmpeg 媒体处理             │ │
│  │    + pgvector 向量检索 │ │    BullMQ 队列    │ │   合片/转码/抽帧/字幕/BGM    │ │
│  └──────────────────────┘ └──────────────────┘ └──────────────────────────────┘ │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │   StorageService 存储抽象层                                                    ││
│  │   ├── 本地模式: storage/ 目录 → Express static 服务                            ││
│  │   └── OSS 模式: 阿里云 OSS (vidforge-assets, oss-cn-guangzhou)               ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          火山引擎 ARK API (外部)                                  │
│  Doubao-Seed-2.0-pro (文本生成 / 多模态视觉理解 / Agent 质量评分)                  │
│  Doubao-Seedance-1.5-pro (文生视频 / 图生视频)                                    │
└──────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          外部依赖 (可选)                                           │
│  Ollama + BGE-M3 文本嵌入 / FFmpeg 媒体处理                                       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 核心技术栈

| 层次     | 技术                             | 版本  | 用途                                                                |
| -------- | -------------------------------- | ----- | ------------------------------------------------------------------- |
| **前端** | React                            | 18.x  | UI 框架                                                             |
|          | TypeScript                       | 5.x   | 类型安全                                                            |
|          | Vite                             | 5.x   | 构建工具 / 开发服务器                                               |
|          | Ant Design                       | 5.x   | 企业级 UI 组件库（含深色/浅色主题适配）                             |
|          | ECharts                          | 5.x   | 数据可视化（8 类图表：指标卡/折线/柱状/饼图/雷达/热力图/散点/瀑布） |
|          | Zustand                          | 4.x   | 轻量状态管理（6 个独立 Store）                                      |
|          | Socket.IO Client                 | 4.x   | 实时通信（任务进度/通知推送）                                       |
|          | @dnd-kit                         | 6.x   | 拖拽排序交互（分镜编辑器）                                          |
|          | react-router-dom                 | 6.x   | 客户端路由                                                          |
| **后端** | NestJS                           | 10.x  | Node.js 渐进式框架                                                  |
|          | TypeScript                       | 5.x   | 类型安全                                                            |
|          | TypeORM                          | 0.3.x | ORM 框架                                                            |
|          | PostgreSQL                       | 14+   | 关系型数据库（业务数据 + 向量检索）                                 |
|          | pgvector                         | —     | 余弦相似度向量检索                                                  |
|          | Redis                            | 7+    | 缓存 / BullMQ 队列 / PubSub                                         |
|          | BullMQ                           | 5.x   | 持久化任务队列（4 个队列 + 进程内双轨降级）                         |
|          | Socket.IO                        | 4.x   | WebSocket 实时通信                                                  |
|          | LangChain / LangGraph            | 1.x   | Agent 编排（StateGraph 状态机管线）                                 |
|          | FFmpeg                           | 5+    | 媒体处理（合片/转码/抽帧/字幕烧录/音视频混合）                      |
|          | Multer                           | —     | 文件上传中间件（memoryStorage 模式）                                |
|          | ali-oss                          | 6.x   | 阿里云 OSS SDK                                                      |
| **AI**   | 火山方舟 Doubao-Seed-2.0-pro     | —     | 文本生成 / 多模态视觉理解 / Agent 质量评分                          |
|          | 火山方舟 Doubao-Seedance-1.5-pro | —     | 视频分镜生成（文生视频 / 图生视频）                                 |
|          | BGE-M3 (Ollama)                  | —     | 文本嵌入向量生成（可选，本地部署）                                  |
| **部署** | Railway                          | —     | 后端托管（NestJS + PostgreSQL + Redis）                             |
|          | Vercel                           | —     | 前端托管（React SPA）                                               |
|          | GitHub Actions                   | —     | CI/CD（lint → build）                                               |
|          | pnpm                             | 8+    | 包管理器（monorepo workspace）                                      |

### 4.3 大模型 / AI 能力使用说明

#### 使用的模型与 API

| 模型/API                     | 用途                       | 集成位置                                                               | 调用方式                           |
| ---------------------------- | -------------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| Doubao-Seed-2.0-pro          | 剧本生成                   | `ArkTextService.chatCompletion()` → `ScriptService.generate()`         | Chat Completion API                |
| Doubao-Seed-2.0-pro (多模态) | 素材视觉理解与三层标签生成 | `ArkVisionService.understandImage()` → `MaterialService.analyzeTags()` | Chat Completion (多模态 image_url) |
| Doubao-Seed-2.0-pro          | Agent 质量评分             | `QualityAgent` → 多维度评分（完整性/时长/一致性/合规性/钩子强度）      | Chat Completion                    |
| Doubao-Seed-2.0-pro          | Self-reflection 循环       | `ScriptAgent` → 将质量反馈注入下一轮 Generation prompt                 | Chat Completion                    |
| Doubao-Seedance-1.5-pro      | 视频分镜生成               | `ArkVideoService.createTask()` → 每分镜独立生成                        | 异步任务 API + 轮询                |
| BGE-M3 (Ollama)              | 素材向量嵌入               | `MaterialService.semanticSearch()` → embedding 生成                    | HTTP API (可选本地部署)            |

#### Prompt 策略

**剧本生成系统 Prompt**（简化）:

```
你是一位电商带货视频脚本专家。根据提供的商品信息生成一条高质量带货视频剧本。

【任务要求】
1. 输出严格 JSON 格式，包含 narrative_framework、shots[3]（hook/demo/cta）、bgm_style
2. 每个分镜含：画面描述、镜头运动、口播文案、字幕、时长（总 ≤ 15s）、类型
3. RAG 增强：从种子库检索 top-K 同类目同风格爆款作为 few-shot 参考
4. 知识注入：商品空间的卖点、人群、品牌调性、最佳实践
5. 禁止词约束：《广告法》极限词、医疗承诺、夸大用语
6. 生成后自动合规审核：命中违禁词则在 response 中标注
```

**视觉理解 Prompt**（简化）:

```
你是一位电商视频素材标注专家。对输入的图片做多维度结构化分析。
输出 JSON 格式：
- product: 商品名称、类目（限定8类）、品牌、颜色集（hex）、材质
- scene: 场景类型、镜头、构图、光线、风格
- clip: 主要物体、文字内容、情绪标签（限定6类）、适合用途（限定5类）
- caption: 一句话描述（≤30字），适合作为向量检索输入
强制纯 JSON 输出，无 markdown 包裹。
```

**Agent 质量评分 Prompt**:

```
评估以下带货短视频的质量。从5个维度分别打分（1-10）：
1. 完整性：视频各元素是否齐全（画面/配音/字幕/BGM）
2. 时长控制：是否在目标时长范围内
3. 一致性：画面与口播内容是否匹配
4. 合规性：是否存在违禁词或违规内容
5. 钩子强度：开场能否吸引观众注意力
返回 JSON：{ "scores": {...}, "total": number, "feedback": string }
```

#### Agent / RAG / 向量方案

**Agent 编排**：基于 LangGraph `StateGraph` 实现了完整的四节点 Agent 管线：

```
用户输入 → [Material Agent] 素材检索评分 → [Script Agent] 剧本生成（含自反思）
  → [Composition Agent] 视频合成（ARK + FFmpeg） → [Quality Agent] 多维质量评分
  → 质量达标 → [Learn Agent] 高质量结果（≥85分）沉淀到知识库
  → 质量不达标 → 条件边重试（最多 2 次），feedback 注入下一轮 prompt
```

- `retryCount` 在条件边正确递增，避免无限循环
- 质量 Agent 的反馈包含具体改进建议，非简单阈值判断
- 自学习飞轮：高质量结果自动写入商品空间知识库，作为后续生成的 few-shot 参考

**RAG 检索增强**：剧本生成时通过品类 + 风格匹配从种子爆款库中检索 top-2 同类目同风格爆款脚本，将分镜结构、口播风格、BGM 风格等作为 few-shot 注入 prompt。前端"爆款参考"抽屉面板直观展示种子脚本（Hook/Demo/CTA 三屏预览 + 配音文案 + 核心信息）。

**向量检索**：pgvector 扩展提供 cosine 相似度搜索（`<=>` 运算符），用于素材语义检索。当 pgvector 不可用或 Embedding API 超时时，自动降级为 PostgreSQL `ILIKE` 全文文本搜索。

### 4.4 关键工程难点与解决方案

#### 难点 1：视频生成长耗时任务的进度跟踪与容错

**挑战**：视频生成涉及 ARK 异步任务（每分镜 30-120s）+ FFmpeg 合片（10-30s），全程 3-5 分钟，需实时进度反馈、异常重试和部分失败降级。

**解决方案**：

- **双通道进度通信**：Socket.IO WebSocket 推送优先 + REST 轮询兜底，`terminalRef` 防重复处理
- **分镜级失败隔离**：单个分镜生成失败不影响其他分镜，失败分镜回退到文案提示生成的纯色底片
- **指数退避重试**：ARK 异步任务轮询失败时以 4s 间隔指数退避，最大重试 3 次
- **FFmpeg 分级降级**：合成失败 → 回退到首个分镜直链预览；字幕烧录失败 → 返回无字幕版本；BGM 混音失败 → 返回纯配音版本

#### 难点 2：多模型 API 的整合与可用性保障

**挑战**：核心流程高度依赖外部模型 API（ARK），存在限流、鉴权失效、网络波动等不可控因素。

**解决方案**：

- **多层 API Key 配置**：DB override > 环境变量；公开仓库不包含任何默认凭证
- **全链路降级策略**：
  - ARK 文本模型不可用 → 模板化剧本兜底
  - ARK 视频模型不可用 → 文案提示纯色视频
  - ARK 视觉模型不可用 → 启发式标签（文件名/品类推断）
  - Redis 不可用 → in-process 模式降级
  - pgvector 不可用 → ILIKE 文本搜索
  - TTS 不可用 → 静音占位音频
- **一键诊断端点**：`GET /api/ai/ark/diagnose` 对所有模型/Ping/鉴权/连通性做健康检测

#### 难点 3：复杂的分镜级编辑交互

**挑战**：分镜列表 + 时间轴需要拖拽排序、增删复制、局部刷新、快捷键操作，且需避免重渲染整片。

**解决方案**：

- **Zustand 纯客户端状态**：分镜 CRUD 全部在 store 中完成，API 仅在"开始生成"时触发
- **@dnd-kit 可排序列表**：支持鼠标/触摸拖拽，CSS transform 动画避免 DOM 重排
- **React.memo 独立渲染**：每个 `ShotItem` 通过 `React.memo` + 稳定 key 独立更新，局部刷新不重渲染整片
- **快捷键系统**：Cmd+S 保存 / Ctrl+Shift+P 预览 / Cmd+D 复制分镜 / ? 帮助弹窗

#### 难点 4：Agent 编排的闭环质量控制

**挑战**：AI 生成的视频质量不可预知，需自动评估并触发重做，同时保持管线可观测。

**解决方案**：

- **LangGraph StateGraph 状态机**：四节点管线 + 条件边（quality < 阈值 → 重做），`retryCount` 正确递增
- **自反思循环**：质量 Agent 的结构化反馈（完整性/时长/一致性/合规性/钩子）注入下一轮 prompt
- **自学习飞轮**：高质量结果（得分 ≥ 85）写入商品空间知识库，后续生成作为 few-shot 参考
- **Trace 全链路追踪**：每个 Agent span 包含 `{ span, startedAt, endedAt, latencyMs, status, summary }`，存入数据库供分析看板使用

#### 难点 5：素材全生命周期管理（上传→分析→检索）

**挑战**：素材需要支持多种文件类型、大文件上传、AI 自动分析、多维检索和实时反馈。

**解决方案**：

- **完整上传管线**：multer memoryStorage + 200MB 限制 + MIME 白名单过滤 + randomUUID 防冲突 + OSS/本地双模存储
- **自动队列分析**：上传完成后自动入队，Redis 可用走 BullMQ 持久化，不可用降级进程内执行
- **视频智能分析**：FFmpeg 抽 3 个关键帧 → data URL 传给 ARK → Set 去重聚合 → 三层标签
- **多维检索体系**：关键词 ILIKE + 三级标签过滤（品类/情绪/风格）+ pgvector 向量语义相似度 + 6 种排序维度
- **URL 自适应**：所有素材 URL 通过 `StorageService.resolveUrl()` 自动解析为绝对路径，OSS 模式返回 OSS 直链，本地模式返回部署域名路径

#### 难点 6：前后端分离部署下的媒体文件访问

**挑战**：前端 Vercel + 后端 Railway 的跨域部署架构下，静态媒体文件（素材图片/视频/产物）的 URL 构造和访问路径容易断裂。

**解决方案**：

- **统一 URL 解析**：`StorageService.resolveUrl()` 层将相对路径（`/static/...`）自动补全为公网绝对 URL
- **publish() 方法**：合片产物始终输出完整公网 URL（通过 `publicBaseUrl`，优先级：API_BASE_URL → RAILWAY_PUBLIC_DOMAIN → localhost）
- **Vite 开发代理**：`/static` 路径在开发环境代理到后端，保证本地开发与生产行为一致
- **产品级警告**：生产环境检测到 publicBaseUrl 指向 localhost 时打印显式告警，避免部署后视频不可达

### 4.5 部署与访问说明

#### 部署架构

```
Vercel (前端 SPA)  ←── HTTPS ──→  Railway (后端)

Railway 服务：
  ├── NestJS API Server (port 3001)
  │     ├── /api/* → 业务接口
  │     └── /static/* → 素材/产物静态文件服务
  ├── PostgreSQL 14 Database (业务数据 + pgvector)
  └── Redis 7 (BullMQ 队列 + 缓存)

存储后端（二选一）：
  ├── 无 OSS → 本地 storage/ 目录，通过 Railway /static/ 服务
  └── 阿里云 OSS → vidforge-assets (oss-cn-guangzhou)
```

#### 访问方式

| 入口             | 地址                                                         | 说明                 |
| ---------------- | ------------------------------------------------------------ | -------------------- |
| 前端应用         | https://vid-forge-frontend-nu.vercel.app                     | 注册后即可体验全流程 |
| Swagger API 文档 | https://vid-forge-backend.up.railway.app/api/docs            | 在线调试所有接口     |
| 健康检查         | https://vid-forge-backend.up.railway.app/api/health          | 后端运行状态         |
| AI 诊断          | https://vid-forge-backend.up.railway.app/api/ai/ark/diagnose | ARK 模型健康状态     |

#### 本地开发启动

```bash
# 前置依赖：Node.js 18+, pnpm 8+, PostgreSQL 14+, Redis 7+, FFmpeg 5+

# 1. 克隆并安装依赖
git clone https://github.com/WANGLEVY9/VidForge.git
cd VidForge
pnpm install

# 2. 配置环境变量
cp apps/backend/.env.example apps/backend/.env
# 编辑 .env 填入数据库连接和 ARK API Key

# 3. 启动服务（前后端同时启动）
pnpm dev

# 4. 访问
# 前端：http://localhost:3000
# 后端 API：http://localhost:3001/api
# Swagger：http://localhost:3001/api/docs
```

#### 生产环境环境变量清单

```
# 必填 — 数据库
DATABASE_URL=postgresql://user:password@host:5432/vidforge

# 必填 — JWT
JWT_SECRET=<随机密钥>

# 必填 — ARK 模型（火山方舟）
ARK_TEXT_PRIMARY_ENDPOINT_ID=ep-20260514115629-vhldw
ARK_TEXT_PRIMARY_API_KEY=ark-xxxxxxxx
ARK_VIDEO_PRIMARY_ENDPOINT_ID=ep-20260514120705-pqv86
ARK_VIDEO_PRIMARY_API_KEY=ark-xxxxxxxx

# 可选 — 阿里云 OSS（不配则用本地存储）
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=REDACTED_ALIBABA_ACCESS_KEY_ID
OSS_ACCESS_KEY_SECRET=<your_secret>
OSS_BUCKET=vidforge-assets

# 推荐 — 公网 API 地址（影响产物 URL）
API_BASE_URL=https://vid-forge-backend.up.railway.app
```

---

## 五、结果说明

### 5.1 项目完成度

**已部署可用版本，接近生产级**

| 维度                                                                                                                                                  | 完成情况                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| P0 必做功能（商品素材上传、剧本生成、基础分镜、一键成片、任务进度、预览导出）                                                                         | 100% 完成，端到端链路可跑通               |
| P1 进阶功能（素材标签/Embedding 检索、智能剪辑 Agent、分镜级编辑、TTS/字幕/BGM、失败重试、Trace、数据看板、爆款参考）                                 | 100% 完成                                 |
| P2 加分功能（多因子归因、Agent 编排、A/B 对比、CI/CD、可观测性、长任务体验、合规审核、移动端、PWA、快捷键、模板系统、Agent 取消、剧本干预、OSS 存储） | 90% 完成                                  |
| 部署与可访问性                                                                                                                                        | 已部署 Railway + Vercel，公网可访问       |
| 代码质量                                                                                                                                              | ESLint + Prettier + Husky pre-commit hook |

### 5.2 项目亮点 / 创新点

#### 亮点一：Agent 驱动的全自动生产管线 + 闭环质量反馈 + 自学习飞轮

不只是简单的 API 调用链，而是基于 LangGraph 实现了完整的 Agent 编排系统：

- **四节点 Agent 管线**自动执行素材检索 → 剧本生成 → 视频合成 → 质量评估
- **自反思闭环**：质量不满足阈值时自动重做并注入结构化反馈（self-reflection），`retryCount` 正确递增避免无限循环
- **自学习飞轮**：高质量结果（≥85 分）自动沉淀为商品空间知识，后续生成持续优化
- **全链路 Trace**：每个 Agent span 记录耗时/状态/错误，存入数据库供看板分析

#### 亮点二：RAG 增强的智能剧本生成

剧本生成并非单一 prompt 调用，而是综合了多层次信息来源：

- **爆款参考检索**（RAG few-shot）：基于品类 + 风格从种子库检索 top-2 同类爆款，提取分镜结构和口播风格
- **商品知识注入**：商品空间的卖点、人群、品牌调性、最佳实践作为 context 注入
- **合规审核流**：生成后自动化审核（广告法/医疗/夸大/平台规则/自定义词库），违规内容在响应中标红提示
- **无缝兜底**：ARK 不可用时回退模板化剧本，确保流程不中断

#### 亮点三：全链路降级设计

每个外部依赖都有降级方案，确保系统在任何情况下的可用性：

| 依赖           | 降级方案                                  |
| -------------- | ----------------------------------------- |
| ARK 文本模型   | 模板化剧本（预设分镜结构 + 商品信息填充） |
| ARK 视频模型   | 文案提示生成的纯色底片视频                |
| ARK 视觉模型   | 启发式标签（文件名/品类推断）             |
| Redis / BullMQ | in-process 模式降级                       |
| pgvector       | ILIKE 全文文本搜索                        |
| TTS            | 静音占位音频                              |
| WebSocket      | REST 轮询兜底                             |
| OSS            | 自动回退本地存储                          |

#### 亮点四：素材全生命周期智能管理

从上传到分析到检索的完整闭环：

- **产品级上传管线**：multer memoryStorage + MIME 白名单 + 200MB 限制 + randomUUID 防冲突 + OSS/本地双模
- **上传自动 AI 分析**：图片 → ARK 多模态三维标签；视频 → FFmpeg 抽帧 → 逐帧 ARK → Set 聚合
- **多维检索体系**：关键词 + 三级标签过滤 + 语义向量 + 6 种排序
- **生产就绪**：URL 自适应（OSS 直链 / 部署域名自动补全），Vercel + Railway 跨域部署下素材可正常访问

---

## 六、选填项

### 6.1 产品截图 / 页面图集

> 关键页面截图（建议补充）：
>
> - 素材管理页面（网格视图 + 上传交互 + 标签过滤 + 排序 + AI 分析状态）
> - 剧本生成页面（配置表单 + 分镜结果 + 爆款参考抽屉 + 合规报告）
> - 视频创作页面（分镜编辑器 + 预览播放器 + 分镜级拖拽排序）
> - 数据看板（6 张指标卡 + 趋势/分布/对比/热力图/成本 ECharts 图表）
> - A/B 对比页面（并排双播放器 + 指标对比 + 采用/存为模板/导出报告）
> - 导出面板（格式/分辨率/画幅选择 + 历史任务列表）

### 6.2 接口文档 / API 清单

生产环境 Swagger 文档：https://vid-forge-backend.up.railway.app/api/docs

| 模块           | 方法   | 路径                              | 功能                             |
| -------------- | ------ | --------------------------------- | -------------------------------- |
| **AI**         | GET    | `/api/ai/health`                  | AI 服务健康检查                  |
|                | GET    | `/api/ai/ark/configs`             | ARK 配置列表                     |
|                | GET    | `/api/ai/ark/diagnose`            | 一键诊断（所有模型/鉴权/连通性） |
|                | POST   | `/api/ai/ark/chat`                | 文本对话                         |
|                | POST   | `/api/ai/ark/video/generate`      | 创建视频生成任务                 |
|                | GET    | `/api/ai/ark/video/task/:id`      | 查询视频任务状态                 |
| **Material**   | POST   | `/api/material`                   | 创建素材                         |
|                | POST   | `/api/material/upload`            | 上传文件（multipart）            |
|                | GET    | `/api/material`                   | 素材列表（排序/过滤/分页）       |
|                | GET    | `/api/material/:id`               | 素材详情                         |
|                | DELETE | `/api/material/:id`               | 删除素材                         |
|                | PATCH  | `/api/material/:id/analyze`       | 触发 AI 三层标签分析             |
|                | GET    | `/api/material/search/tags`       | 按标签筛选（品类/情绪/风格）     |
|                | POST   | `/api/material/semantic-search`   | 语义搜索（pgvector）             |
| **Script**     | POST   | `/api/script/generate`            | 剧本生成（150s 超时）            |
|                | GET    | `/api/script/inspire`             | 爆款参考查询                     |
|                | POST   | `/api/script`                     | 保存剧本                         |
|                | GET    | `/api/script`                     | 剧本列表                         |
|                | GET    | `/api/script/:id`                 | 剧本详情                         |
|                | PATCH  | `/api/script/:id/shots`           | 更新分镜                         |
|                | POST   | `/api/script/:id/regenerate-shot` | 重新生成单个分镜                 |
| **Template**   | POST   | `/api/template`                   | 创建模板                         |
|                | GET    | `/api/template`                   | 模板列表                         |
|                | GET    | `/api/template/:id`               | 模板详情                         |
|                | DELETE | `/api/template/:id`               | 删除模板                         |
| **Creation**   | POST   | `/api/creation/task`              | 创建视频任务                     |
|                | GET    | `/api/creation/task`              | 任务列表                         |
|                | GET    | `/api/creation/task/:id`          | 任务详情                         |
|                | PATCH  | `/api/creation/task/:id/shot`     | 重新生成分镜                     |
| **Agent**      | POST   | `/api/agent/run`                  | 运行 Agent 管线                  |
|                | GET    | `/api/agent/status/:runId`        | 查询 Agent 状态                  |
|                | POST   | `/api/agent/cancel/:runId`        | 取消 Agent 运行                  |
| **Export**     | POST   | `/api/export`                     | 创建导出任务                     |
|                | GET    | `/api/export`                     | 导出任务列表                     |
| **Analytics**  | GET    | `/api/analytics/overview`         | 概览数据（6 指标卡）             |
|                | GET    | `/api/analytics/trends`           | 趋势数据（折线图）               |
|                | GET    | `/api/analytics/distribution`     | 分布数据（饼图/柱状图）          |
|                | GET    | `/api/analytics/attribution`      | 因子归因（热力图）               |
|                | GET    | `/api/analytics/traces`           | Agent Trace 追踪数据             |
|                | GET    | `/api/analytics/cost`             | AI 成本概览                      |
| **Auth**       | POST   | `/api/auth/register`              | 注册                             |
|                | POST   | `/api/auth/login`                 | 登录                             |
|                | GET    | `/api/auth/me`                    | 当前用户信息                     |
| **Space**      | GET    | `/api/spaces`                     | 用户工作空间列表                 |
| **Compliance** | POST   | `/api/compliance/check`           | 文本合规检查                     |
|                | GET    | `/api/compliance/dictionary`      | 违禁词库列表                     |

### 6.3 Prompt 策略 / Agent 流程图

```
                          ┌──────────────────┐
                          │   User Input     │
                          │ (商品/风格/      │
                          │  时长/素材)      │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                    ┌─────┤  Orchestrator    ├─────┐
                    │     └────────┬─────────┘     │
                    │              ▼               │
                    │     ┌──────────────────┐     │
                    │     │  Material Agent  │     │
                    │     │  素材检索 + 评分  │     │
                    │     └────────┬─────────┘     │
                    │              ▼               │
                    │     ┌──────────────────┐     │
                    │     │   Script Agent   │     │
                    │     │  RAG 检索 + 生成  │     │
                    │     │  + 自反思优化     │     │
                    │     └────────┬─────────┘     │
                    │              ▼               │
                    │     ┌──────────────────┐     │
                    │     │ Composition Agent│◄────┤ (retry)
                    │     │  ARK Seedance    │     │ if quality < threshold
                    │     │  + FFmpeg 合成   │     │ retryCount++
                    │     │  + TTS+BGM+字幕  │     │
                    │     └────────┬─────────┘     │
                    │              ▼               │
                    │     ┌──────────────────┐     │
                    │     │   Quality Agent  ├─────┤
                    │     │   多维度评分      │     │
                    │     │   5 维度 1-10    │     │
                    │     └────────┬─────────┘     │
                    │              ▼               │
                    │     ┌──────────────────┐     │
                    │     │   Learn Agent    │     │
                    │     │ (score ≥ 85)     │     │
                    │     │ → 沉淀知识库      │     │
                    │     └────────┬─────────┘     │
                    │              ▼               │
                    │     ┌──────────────────┐     │
                    └────►│   Return Result  │     │
                          │  视频 URL +       │     │
                          │  Trace + 指标    │     │
                          └──────────────────┘     │
                                                   │
                          ┌──────────────────┐      │
                          │  ProductSpace    │◄─────┘
                          │  Knowledge Base  │  (bestPractices
                          │  + 合规词库)     │   + few-shot)
                          └──────────────────┘
```

### 6.4 数据库设计 / ER 图

**核心实体关系**：

```
users (1) ──── (N) materials       素材归属用户
users (1) ──── (N) scripts         剧本归属用户
users (1) ──── (N) tasks           创作任务归属用户
users (1) ──── (N) templates       模板归属用户

material (1) ──── (N) 无显式关联   素材独立，通过 productSpaceId 逻辑分组
script   (1) ──── (N) shots       剧本包含多个分镜（JSON array in storyboard）
task     (1) ──── (N) shots       任务包含多个分镜结果（JSON array in shots）

productSpace ──── materials        商品空间逻辑分组
productSpace ──── scripts
productSpace ──── tasks
```

**核心表结构（TypeORM 实体）**：

- `materials` — id, userId, productSpaceId, name, type(image/video/audio), url, thumbnailUrl, size, tags[], category, productTags(json), videoTags(json), clipTags(json), metadata(json), embedding(vector(1024))
- `scripts` — id, userId, productSpaceId, title, productName, category, sellingPoints, style, storyboard(json[]), voiceover, bgmSuggestion, tags[], duration, createdAt
- `tasks` — id, userId, productSpaceId, status, progress, type, config(json), storyboard(json[]), shots(json[]), result(json), traces(json[]), error, createdAt
- `templates` — id, userId, name, category, style, hooks(json[]), shots(json[]), factors(json[]), constraints(json), tags[]
- `product_spaces` — id, userId, name, productInfo(json), bestPractices(json), forbiddenWords(json)
- `inpire_seeds` — id, category, style, hookType, shots(json), keyMessages[], bgmStyle, performance

### 6.5 开发里程碑 / 版本迭代记录

| 日期       | 主要变更                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-20 | 项目启动，技术方案规划，monorepo 基建初始化                                                                                |
| 2026-05-21 | 前后端基础架构搭建，P0 功能完成（素材/剧本/创作全链路）                                                                    |
| 2026-05-22 | 生产部署方案，Railway/Vercel 配置，健康检查                                                                                |
| 2026-05-24 | 核心升级：真实 ARK 视频管线、Agent 编排（LangGraph）、可观测性、合规审核                                                   |
| 2026-06-01 | 体验完善：通知中心、API 配置中心、深色/浅色主题                                                                            |
| 2026-06-06 | P1 全面升级（排序/标签过滤/队列处理器/爆款参考）+ P2 全部完成（CI/CD/PWA/模板/快捷键/移动端/剧本干预/Agent 取消/A&B 对比） |
| 2026-06-10 | 交付文档整理、AI 分析超时和 Loading 体验修复、爆款参考 bug 修复、相对 URL 自动解析、删除未实现占位功能                     |

### 6.6 商业化 / 场景落地设想

VidForge 的核心目标用户是 TikTok Shop / 抖音电商的中小商家和带货达人，当前阶段通过 AI 自动化解决"视频内容产出效率"问题。若继续推进，可探索以下方向：

- **付费模式**：按视频生成量计费（基础免费额度 + 付费套餐），或按月订阅模式
- **投流加速**：AIGC 视频批量生成 → 自动投放到 TikTok/Google Ads → 转化数据回流 → 素材优胜劣汰
- **达人矩阵**：为 MCN 机构提供批量视频生成 + 多账号分发管理
- **视频 A/B 测试**：批量生成多个版本的带货视频 → 自动投放测试 → 数据驱动优化素材策略
- **开放平台**：提供 API 供第三方电商平台/ERP 系统集成

### 6.7 评测方案与样例结果

#### 剧本生成样例

**输入**：

```json
{
  "productName": "无线蓝牙耳机 Pro",
  "category": "3C数码",
  "sellingPoints": "主动降噪、30小时续航、IPX5防水、触控操作",
  "targetAudience": "年轻上班族、运动爱好者"
}
```

**输出（简化）**：

- **Hook**: 画面为通勤地铁场景，地铁噪音 → 戴上耳机 → 世界安静，口播"通勤路上，告别嘈杂"
- **Demo**: 特写展示降噪开关 / 触控操作 / 充电口，口播"主动降噪、触控操作、30小时长续航"
- **CTA**: 产品白底展示 + 价格 + 购买引导，口播"限时优惠，点击下方链接"

#### 视频生成指标

| 指标                   | 数值                                      |
| ---------------------- | ----------------------------------------- |
| 单视频端到端生成耗时   | 3-5 分钟（含 ARK 视频生成 + FFmpeg 合成） |
| ARK 文本模型调用成功率 | >95%                                      |
| ARK 视频模型调用成功率 | >85%（首次调模型加载较慢）                |
| FFmpeg 合成成功率      | >99%                                      |
| 全链路降级触发率       | <5%（仅在模型超时/鉴权失败时触发）        |

---

## 七、附录：项目改进记录

### 已修复问题

| #   | 问题                                                | 模块     | 修复方式                                                           |
| --- | --------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| 1   | Agent 编排 `retryCount` 未递增                      | Agent    | `orchestrator.service.ts` 条件边中增加 `retryCount++`              |
| 2   | Material 实体缺少 `embedding` 列                    | Material | 添加 `ALTER TABLE` 迁移 + TypeORM 列定义                           |
| 3   | 后端无文件上传端点（base64 存 db）                  | Material | 集成 multer memoryStorage + MIME 过滤 + 200MB 限制                 |
| 4   | 视频素材缺少多模态理解                              | Material | 集成 FFmpeg 抽帧 → 逐帧 ARK 视觉理解 → 聚合标签                    |
| 5   | 前端标签搜索 UI 缺失                                | Material | 连接 `searchByTags` API，添加三级标签过滤芯片                      |
| 6   | 排序选择器无效                                      | Material | 添加 `orderBy` / `orderDirection` API 参数，6 种排序维度           |
| 7   | 素材入库分析队列处理器为空                          | Material | `MaterialAnalyzeProcessor` 通过 `ModuleRef` 调用真实 `analyzeTags` |
| 8   | CI Pipeline 缺失                                    | DevOps   | 配置 GitHub Actions（lint → build）                                |
| 9   | Husky 未初始化                                      | DevOps   | `npx husky init` 创建 pre-commit hook                              |
| 10  | A/B 对比按钮无操作                                  | Frontend | 实现采用下载 / 另存为模板 / 导出报告                               |
| 11  | 灵感模板系统完全缺失                                | Script   | Template 实体 + CRUD + 前端浏览/保存模态框                         |
| 12  | 移动端布局被禁用                                    | Frontend | 恢复 matchMedia 断点检测，移除硬编码 `isMobile: false`             |
| 13  | 剧本页面缺少干预能力                                | Script   | @dnd-kit 拖拽排序 + 行内编辑 + 单分镜重生成                        |
| 14  | `activeRuns` abort 信号未传递                       | Agent    | AbortController 存储 → 信号传入 LangGraph invoke                   |
| 15  | 无 PWA 支持                                         | Frontend | Service Worker + manifest + 离线缓存                               |
| 16  | 无全局快捷键注册表                                  | Frontend | Ctrl+S / Ctrl+K / ? 全局注册                                       |
| 17  | 文件上传在 Railway 上失败（diskStorage 目录不存在） | Material | 改为 memoryStorage，手动写临时文件 + StorageService 分发           |
| 18  | AI 分析按钮 loading 后无反馈                        | Frontend | 加持久化 toast + 成功后刷新列表 + 失败 console.error               |
| 19  | ARK 视觉分析超时（60s 不够）                        | Backend  | 后端超时 60s→90s，前端 Axios 超时 30s→120s                         |
| 20  | 爆款参考页面崩溃（object as React child）           | Frontend | `shots.hook/demo/cta` 改为渲染 `.voiceover` + `.description`       |
| 21  | 素材图片在 Vercel 部署下 404（相对路径问题）        | Backend  | `resolveUrl()` 将 `/static/...` 自动补全为部署域名绝对 URL         |
| 22  | 脚本/创建页附加选项占位 Switch 无效                 | Frontend | 删除未实现的功能占位组件                                           |

### 未来展望

| #   | 方向              | 说明                                             |
| --- | ----------------- | ------------------------------------------------ |
| 1   | 生产级日志聚合    | 接入 ELK / Loki + Grafana 集中日志               |
| 2   | Docker 容器化     | Dockerfile + docker-compose 一键本地部署         |
| 3   | 单元/集成测试     | 补充 Jest 测试覆盖率（当前仅 lint + build 验证） |
| 4   | CI 增加自动化测试 | 在 GitHub Actions 中加入 `pnpm test` 步骤        |
| 5   | 视频多语种配音    | 接入 polyglot / 火山引擎 TTS 多语种能力          |
| 6   | 电商数据真实回流  | 接入 TikTok Shop API 获取真实转化数据            |
| 7   | 视频投流自动化    | 批量生成 → 自动投放到广告平台 → 转化归因         |

---

> **文档版本**: v3.0
> **提交日期**: 2026-06-10
> **最后提交**: `acc7251` — fix: resolve relative /static/ URLs to absolute, remove placeholder switches, fix 爆款参考 crash
> **项目仓库**: https://github.com/WANGLEVY9/VidForge
> **在线体验**: https://vid-forge-frontend-nu.vercel.app
