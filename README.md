# VidForge - 电商场景 AIGC 带货视频生成系统

> VidForge 是一个社区维护的开源项目，当前处于积极开发阶段。它不隶属于 OpenAI、火山引擎或 TikTok。

面向 TikTok Shop 等跨境电商商家的 AIGC 带货视频生成全链路系统。商家上传商品素材 → 输入卖点 → 系统自动生成多分镜剧本 → 一键合成 ≤15s 的带货短视频(支持 9:16 / 16:9)。

> **V2 升级亮点(2026-05-31)**:LangGraph 多 Agent 真实推理 / FFmpeg 真实合片 / 端到端 Trace + 成本观测 / RAG 爆款知识库 / 商品空间知识飞轮 / 三层合规审核

## ✨ 核心能力

### 端到端真实管线

- 🎯 **真实视频合成**:多分镜并行调用 ARK Doubao-Seedance-1.5-pro → FFmpeg concat 拼接 → TTS 配音 + BGM 混音 + 字幕烧录 → 成片落 `/static/outputs/...`
- 🤖 **LangGraph 多 Agent 编排**:Material → Script → Composition → Quality 4 节点真实推理,Quality 不达标自动 replan,带 self-reflection 反馈
- 📊 **端到端 Trace**:每次 ARK 调用 / Agent 节点 / FFmpeg 任务都落 trace_spans 表,Token / 成本 / Cache hit / 延迟全部可观测
- 🔍 **多模态素材理解**:图片素材自动调 ARK Doubao-Seed-2.0-pro 视觉理解,输出商品 / 画面 / 剪辑三层结构化标签 + caption + pgvector 语义检索

### 差异化能力

- 📚 **RAG 爆款知识库**:内置 25+ 条人工标注电商爆款脚本,按品类 × 风格 Top-K 检索作为 few-shot 注入 prompt
- 🎁 **商品空间知识飞轮**:每个商品空间维护品牌 TOV / 卖点 / 自定义违禁词 / 高分历史脚本,生成时自动注入,**用得越久越懂品牌**
- ✅ **三层合规审核**:广告法极限词 + 医疗保健禁用语 + 平台规则(TikTok/抖音电商) + 商家自定义词典,综合分 < 60 才触发 LLM 二次复核(降本)
- 🔄 **A/B 真实任务对比**:双视频同步播放 + 真实指标(成功率/时长/合片状态/TTS/字幕)差异
- ⏱️ **断点容错**:单分镜失败不阻塞整体;合片失败回退首段视频作预览;ARK 失败回落内置模板

### 工程基建

- 🚦 **BullMQ 双轨队列**:Redis 可用走持久化 + 重试 + DLQ;不可用降级进程内执行(单实例可跑通)
- 💰 **成本观测**:Dashboard 实时显示今日 Token / 估算成本 / Cache hit 率 / 平均延迟
- 🌐 **响应式设计**:PC + 移动端双适配(Phase 4 移动端代码就绪,可一键启用)

## 🛠 技术栈(V2 实际使用)

| 技术域   | 选型方案                                                                   |
| -------- | -------------------------------------------------------------------------- |
| 前端     | React 18 + TypeScript + Vite + Ant Design v5 + Zustand + ECharts           |
| 后端     | NestJS 10 + TypeScript + TypeORM + PostgreSQL + pgvector(可选)             |
| 多 Agent | `@langchain/langgraph` StateGraph + 条件回退                               |
| 媒体处理 | FFmpeg(child_process 直调)+ BullMQ + 火山 OpenSpeech TTS(可选)             |
| AI 能力  | 火山方舟 ARK:Doubao-Seed-2.0-pro(文本+视觉)/ Doubao-Seedance-1.5-pro(视频) |
| 实时通信 | Socket.IO `/creation` namespace                                            |
| 部署     | Railway(后端 Nixpacks)+ Vercel(前端 Vite)                                  |

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- PostgreSQL ≥ 14
- ffmpeg ≥ 4.x(必需,本地 `brew install ffmpeg` 或 `apt install ffmpeg`)
- Redis ≥ 7(可选,缺失自动降级)

### 本地启动

```bash
# 1. 安装依赖
cd apps/backend && npm install --legacy-peer-deps
cd ../frontend && npm install --legacy-peer-deps

# 2. 环境变量(最小集)
cd ../backend
cat > .env <<EOF
DATABASE_URL=postgresql://localhost:5432/vidforge
DB_SYNCHRONIZE=true
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
NODE_ENV=development
EOF

# ARK 凭证不会内置在代码中。需要使用 ARK 功能时，请在本地 `.env` 中配置下列环境变量。

# 3. 启动后端
npm run start:dev    # http://localhost:3001/api
                     # Swagger:http://localhost:3001/api/docs

# 4. 另起终端启动前端
cd ../frontend && npm run dev    # http://localhost:3000
```

### 默认账号

后端启动时自动播种 demo 账号:`demo@vidforge.app` / `demo1234`

## 📁 项目结构

```
apps/
├── frontend/              # React 18 + Vite SPA
│   └── src/
│       ├── pages/         # material / script / creation / dashboard / ab-compare / workspace
│       ├── components/    # storyboard / layout / dashboard / studio / common
│       ├── store/         # Zustand: useAppStore / useAuthStore / useSpaceStore / useStoryboardStore
│       └── services/      # auth / space / material / script / creation / agent / analytics / ai
└── backend/               # NestJS 10 + TypeORM
    └── src/modules/
        ├── auth          # JWT 鉴权 + bcrypt + 自动 demo 账号
        ├── product-space # 商品空间(数据隔离 + 知识库飞轮)
        ├── material      # 素材库 + ARK 视觉理解打标 + pgvector 语义检索
        ├── script        # 剧本生成(ARK + RAG few-shot + 知识库注入)
        ├── creation      # 视频任务(ARK Seedance + FFmpeg 合片 + Socket.IO 推送)
        ├── agent         # LangGraph 4 节点编排
        ├── analytics     # 数据看板(全部接真数据)
        ├── export        # 导出转码(FFmpeg)
        ├── ai            # ARK 文本/视觉/视频 客户端封装
        ├── media         # FFmpeg / TTS / 字幕 / BGM / Composer / Storage
        ├── queue         # BullMQ 双轨队列
        ├── trace         # 端到端 trace + 成本观测
        ├── compliance    # 三层合规审核
        └── rag           # 爆款脚本种子库
```

## 🔐 安全与凭证

所有 API Key、JWT 密钥、数据库凭证和对象存储密钥都必须通过环境变量或部署平台的 Secret 注入，绝不要提交到 Git。公开仓库只提供 `apps/backend/.env.example` 模板。若怀疑凭证曾经提交过，请立即撤销并重新生成。

## 📖 关键流程

### 1. 创建商品空间 + 配置知识库

进入 `/workspace`,新建商品空间,在知识库里配置:

- 核心卖点(短句数组)
- 目标人群画像
- 品牌 TOV(语气调性)
- 自定义违禁词

每次生成剧本时,这些会自动拼到 prompt,**让系统越用越懂你的品牌**。

### 2. 上传素材并智能分析

进入「素材库」上传图片 → 点击 ✨ "智能分析" 按钮 → ARK 视觉理解自动写入三层标签 + 一句话描述 + embedding。

### 3. 生成剧本(自动 RAG + 合规扫描)

进入「剧本工作室」输入商品信息,系统会:

1. 检索同品类同风格的爆款 Top-K 注入 prompt
2. 调 ARK Doubao-Seed-2.0-pro 生成 hook/demo/cta 三分镜
3. 自动合规扫描,返回 `compliance` 字段
4. 注入商品空间知识库

### 4. 生成视频(全链路真实)

进入「视频创作」点击生成:

- 并发调 ARK Seedance 生成所有分镜
- WebSocket 实时推进度
- 全部成功后 FFmpeg 合片 + TTS + BGM + 字幕烧录
- 产物落 `/static/outputs/creation/<id>.mp4`

### 5. 数据看板查看成本

Dashboard 页面会显示:

- 今日生成 Token 数 / 估算成本
- ARK Prompt Cache 命中率
- 任务追踪瀑布图(LangGraph 各节点耗时)

## 🔧 部署

### Railway(后端)+ Vercel(前端)

推荐部署方式。详见 [生产部署方案](./docs/生产部署方案.md)。

**Railway 必填环境变量**:

```
DATABASE_URL          # 必填
DB_SYNCHRONIZE=true   # 首次部署开启,验证后改为 false
JWT_SECRET            # 64 字节 hex
NODE_ENV=production
WEB_BASE_URL          # https://<vercel-domain>
```

**可选**:

```
REDIS_URL             # 缺失则降级进程内队列
VOLC_TTS_APPID/TOKEN  # 缺失则 TTS 生成静音占位
```

**首次部署后必跑验证清单**:

1. `GET /api/health` → 200
2. `GET /api/ai/ark/diagnose` → 双模型 ping 成功
3. 注册 / 登录 / 上传图片 / 智能分析 / 生成剧本 / 创建视频任务全链路 OK
4. 视频任务完成后 `result.url` 直接浏览器访问可播放

## 📄 相关文档

- [项目记忆 / 迭代记录](./docs/项目记忆.md)
- [生产部署方案](./docs/生产部署方案.md)
- [部署检查清单](./docs/部署检查清单.md)
- [占位符记录](./docs/占位符记录.md)
- [架构说明](./docs/架构说明.md)

## 📝 开发规范

- ESLint + Prettier + Stylelint + Husky + lint-staged 全部启用
- 遵循 Conventional Commits(`feat:` / `fix:` / `docs:` / ...)
- 所有 ARK 调用经过 trace 落库,新增模型务必复用 ArkTextService/ArkVideoService

## 📜 许可证

MIT License
