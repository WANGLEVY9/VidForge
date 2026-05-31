# VidForge 会话续接文档(Session Handoff)

> **生成时间**:2026-05-31
> **目的**:用户终端乱码需重启,本文件用于新 Claude 会话快速续接,不要压缩任何关键细节。
> **新会话首次读取顺序**:本文件 → `README.md` → `docs/项目记忆.md` → `docs/占位符记录.md`

---

## 一、项目核心定位(必读)

**VidForge** = 面向 TikTok Shop / 抖音电商商家的 AIGC 带货视频生成全链路系统。

**重要背景**:这是**字节跳动 AI 全栈开发比赛**项目(用户在第二轮明确告知)。
- 评委角度:技术深度 + 工程完整度 + 创新点 + 端到端 demo
- 同时也是字节生态内项目,**优先用火山方舟 Doubao 模型**,这是天然加分项
- 用户要求**比赛背景不要直接出现在项目文字里**,但所有改造决策都应围绕"如何在比赛中脱颖而出"
- 部署:Railway 后端 + Vercel 前端,公开域名:**`https://vid-forge-frontend-nu.vercel.app`**
- 仓库:**私有** GitHub repo `git@github.com:WANGLEVY9/VidForge.git`,因此 API key 可硬编码

---

## 二、ARK 模型凭证(关键!)

用户在第三轮提供,本会话已硬编码到 `apps/backend/src/modules/ai/config/ark.config.ts`:

```typescript
const BUILTIN_DEFAULTS = {
  textPrimary: {
    endpointId: 'ep-20260514115629-vhldw',
    apiKey: 'ark-0a0ae159-729d-4b5d-9c2d-a5bf04824ff5-d42e3', // ✅ 已验证有效
    name: 'Doubao-Seed-2.0-pro',  // 100 RPM 50W TPM,支持视觉理解
  },
  videoPrimary: {
    endpointId: 'ep-20260514120705-pqv86',
    apiKey: 'ark-0a0ae159-729d-4b5d-9c2d-a5bf04824ff5-d42e3', // 同 key
    name: 'Doubao-Seedance-1.5-pro', // 5 并发
  },
};
```

**关键事实**(已 curl 直测验证):
- ✅ `ark-0a0ae159-...-d42e3` → 调通,返回 "pong~"(有效)
- ❌ `ark-f26df94a-...-dd663` → 返回 "The API key doesn't exist"(失效)

**ARK 端点**:`https://ark.cn-beijing.volces.com/api/v3`(代码硬编码)

---

## 三、完整工作历史(按对话轮次)

### 第 1 轮:用户让我读懂整个项目
- 我用 3 个 sub-agent 并行调研(后端/前端/规划文档)产出了完整全景报告
- 项目状态:架构清晰,工程基建过硬,但 README 宣称的能力(FFmpeg/BullMQ/Milvus)在代码里全是 stub
- 关键发现:fluent-ffmpeg 在 deps 里但没用、BullMQ 在 deps 里但没用、Milvus 改成了 pgvector

### 第 2 轮:用户要求出"优化清单 + 实施规划"
- 我产出 P0~P4 分级清单(P0 致命短板/P1 AI 深度/P2 差异化/P3 工程质量/P4 Demo)
- 推荐 4 周实施路线,~28 人日工作量

### 第 3 轮:用户让我开始改造,提供 ARK Key
- 12 个核心任务全部完成(见下方"已完成任务"清单)
- 提交 commit `b191477`:55 files / 4806 insertions / 470 deletions

### 第 4 轮:用户要求审查 + 推送
- 我做 type-check + build + smoke test,**发现 3 个致命 bug**:
  1. 🔴 BullMQ 队列名不能含 `:`,改为 `creation-shot` 等
  2. 🔴 没 Redis 时 BullMQ 重连风暴卡死启动 → 改 QueueModule 为条件加载(`forRoot()`)
  3. 🟠 nixpacks.toml 没装 ffmpeg → 加上
- 提交并推送成功

### 第 5 轮:继续优化(本轮,被中断)
- 完成了 5 项新工作(13~17),**18、19 未完成**
- 用户报告 Railway 上 ARK 报"API key doesn't exist"
- 我定位是 **Railway env 上有旧 key 覆盖了硬编码** → 给出修复指引
- 用户中断了最后一次 build 验证

---

## 四、本仓库已完成的全部 20 项任务

### 第三轮(原 P0+P1 12 项,已 commit `b191477` 推送)

| # | 任务 | 状态 | 关键文件 |
|---|---|---|---|
| 1 | 硬编码 ARK Key 默认值 | ✅ | `apps/backend/src/modules/ai/config/ark.config.ts` |
| 2 | BullMQ 真实队列 | ✅ | `apps/backend/src/modules/queue/*` |
| 3 | FFmpeg 合片管线 | ✅ | `apps/backend/src/modules/media/services/{ffmpeg,subtitle,tts,bgm,composer,storage}.service.ts` |
| 4 | Material 三层标签自动分析 | ✅ | `apps/backend/src/modules/ai/services/ark-vision.service.ts`, `material.service.ts` |
| 5 | Agent 4 节点真实推理 | ✅ | `apps/backend/src/modules/agent/agents/*` 全部重写 |
| 6 | Export 真实编码 | ✅ | `apps/backend/src/modules/export/export.service.ts` |
| 7 | Analytics 真实数据替换 mock | ✅ | `apps/backend/src/modules/analytics/analytics.service.ts` |
| 8 | 前端清理 stub + 接真 API | ✅ | `apps/frontend/src/pages/material/index.tsx`, `pages/ab-compare/*` |
| 9 | RAG 爆款脚本知识库 | ✅ | `apps/backend/src/modules/rag/hit-scripts.seed.ts` (9 条种子,**待扩充至 25+**) |
| 10 | 端到端 Trace + 成本观测 | ✅ | `apps/backend/src/modules/trace/*` |
| 11 | 合规审核管线 | ✅ | `apps/backend/src/modules/compliance/*` |
| 12 | 商品空间 RAG 飞轮 | ✅ | `ProductSpace.knowledge` 字段 + ScriptService 注入 |

### 第五轮(本次新增,**未 commit/push**,等用户确认)

| # | 任务 | 状态 | 关键文件 |
|---|---|---|---|
| 13 | README + 占位符 + 架构说明对齐 | ✅ | `README.md`, `docs/占位符记录.md` |
| 14 | 前端可视化 RAG / 合规 / 成本 | ✅ | `apps/frontend/src/components/script/{RagReferenceCard,ComplianceCard}.tsx`, `apps/frontend/src/components/dashboard/CostOverviewCard.tsx`, `apps/frontend/src/services/{script,analytics}.ts`, `pages/script/index.tsx`, `pages/dashboard/index.tsx` |
| 15 | 爆款脚本自学习飞轮闭环 | ✅ | `product-space.service.ts` 新增 `learnFromHighScore()`, `agent/orchestrator.service.ts` 新增 `maybeLearn()`, ScriptService.buildFewShotBlock 接 bestPractices |
| 16 | ARK 应用级响应缓存 | ✅ | `apps/backend/src/modules/ai/services/ark-response-cache.service.ts` (LRU 1000 / TTL 6h / 仅 temp≤0.5),`ark-text.service.ts` 接入 |
| 17 | 全局限流 + 任务取消 | ✅ | `@nestjs/throttler` 已加依赖 + 接入,Creation Service 加 `cancel()` 方法 + 取消标志 |
| 18 | 爆款种子库扩充 25+ | ⏸ **未做** | `apps/backend/src/modules/rag/hit-scripts.seed.ts` 当前只有 9 条 |
| 19 | 演示种子数据脚本 | ⏸ **未做** | 计划新建 `apps/backend/src/scripts/seed.ts` |
| 20 | 紧急 Railway Key 排查 | ✅ | 已诊断完成,改进了 `ai.controller.ts` diagnose 端点 |

---

## 五、当前 git 状态(关键!)

最后已推送 commit:**`b191477`** "feat: V2 核心能力深度升级"
- 远端:`git@github.com:WANGLEVY9/VidForge.git` 分支 `main`
- 本地分支:`main`,**位于 b191477 之上有大量未提交修改**

**未提交修改的文件(估算)**:
```
M apps/backend/package.json                              # 加了 @nestjs/throttler
M apps/backend/src/app.module.ts                          # 加了 ThrottlerModule + APP_GUARD
M apps/backend/src/modules/ai/ai.controller.ts            # diagnose 加 keySource 字段
M apps/backend/src/modules/ai/ai.module.ts                # 加 ArkResponseCacheService
M apps/backend/src/modules/ai/services/ark-text.service.ts # 接入 cache
M apps/backend/src/modules/agent/agent.module.ts          # 加 ProductSpaceModule 导入
M apps/backend/src/modules/agent/orchestrator.service.ts  # 加 maybeLearn
M apps/backend/src/modules/script/script.service.ts       # buildFewShotBlock 接 bestPractices
M apps/backend/src/modules/product-space/product-space.service.ts # 加 learnFromHighScore
M apps/backend/src/modules/product-space/dto/product-space.dto.ts # 加 ProductKnowledgeDto
M apps/backend/src/modules/creation/creation.service.ts   # 加 cancel + cancelFlags
M apps/frontend/src/services/script.ts                    # 加 ComplianceReport/RagReference 类型 + inspire()
M apps/frontend/src/services/analytics.ts                 # 加 CostOverview 类型 + getCostOverview
M apps/frontend/src/pages/script/index.tsx                # 接入 RagReferenceCard / ComplianceCard
M apps/frontend/src/pages/dashboard/index.tsx             # 加 CostOverviewCard
M README.md                                                # 完全重写,V2 真实能力
M docs/占位符记录.md                                       # 完全重写
?? apps/backend/src/modules/ai/services/ark-response-cache.service.ts
?? apps/frontend/src/components/script/RagReferenceCard.tsx
?? apps/frontend/src/components/script/ComplianceCard.tsx
?? apps/frontend/src/components/dashboard/CostOverviewCard.tsx
```

**最后的中断点**:正在跑 `npm run build` + smoke test 验证刚加的变更,被用户打断。**新会话续接需先跑这个验证再 commit**。

---

## 六、🚨 用户最关心的问题:Railway ARK Key 失效

### 根因(已诊断)
用户 Railway 上的 env vars 包含旧 ARK key:
```
ARK_TEXT_PRIMARY_API_KEY="ark-f26df94a-6b3a-4535-bd66-465266a7e1af-dd663"  # ❌ 已失效
ARK_VIDEO_PRIMARY_API_KEY="ark-f26df94a-6b3a-4535-bd66-465266a7e1af-dd663" # ❌ 已失效
```

由于 `ark.config.ts` 中 env 优先级高于硬编码默认,**Railway 环境实际生效的是这个失效 key**,导致所有 ARK 调用 fallback 到示例剧本。

### 用户需要做的修复(已告知用户)
**两选一**:
1. **方案 A**:Railway 改 env 为新 key
   ```
   ARK_TEXT_PRIMARY_API_KEY=ark-0a0ae159-729d-4b5d-9c2d-a5bf04824ff5-d42e3
   ARK_VIDEO_PRIMARY_API_KEY=ark-0a0ae159-729d-4b5d-9c2d-a5bf04824ff5-d42e3
   ```
2. **方案 B**(更简单,推荐):Railway 直接**删除**这两条 env,代码硬编码默认值会自动生效

EP 那两个 env (`ARK_TEXT_PRIMARY_ENDPOINT_ID` / `ARK_VIDEO_PRIMARY_ENDPOINT_ID`) 删不删都行(值与硬编码一致)。

### 用户 Railway 当前完整 env(用户在第五轮 dump 给我)
```
ARK_TEXT_PRIMARY_API_KEY="ark-f26df94a-6b3a-4535-bd66-465266a7e1af-dd663"   # ❌ 待改
ARK_TEXT_PRIMARY_ENDPOINT_ID="ep-20260514115629-vhldw"                       # ✅ 正确
ARK_TEXT_PRIMARY_NAME="Doubao-Seed-2.0-pro"
ARK_VIDEO_PRIMARY_API_KEY="ark-f26df94a-6b3a-4535-bd66-465266a7e1af-dd663"  # ❌ 待改
ARK_VIDEO_PRIMARY_ENDPOINT_ID="ep-20260514120705-pqv86"                      # ✅ 正确
ARK_VIDEO_PRIMARY_NAME="Doubao-Seedance-1.5-pro"
DATABASE_URL="postgresql://postgres:ITcHwtiwZGrhiDYIlXJmsHoaSsxoTubw@postgres.railway.internal:5432/railway"
DB_SYNCHRONIZE="true"
JWT_SECRET="b134a31f373fc7b1d07debec7c36e92c20a24d45fac2462fa2c0988285a401ecd365c08d098591fb05a71a204a50788c571ab3db26470506540e7b4c607da217"
NODE_ENV="production"
PORT="8080"
REDIS_URL="${{Redis.REDIS_URL}}"
WEB_BASE_URL="https://vid-forge-frontend-nu.vercel.app"
ARK_TEXT_PRIMARY_RATE_LIMIT="100RPM 50WTPM"
ARK_VIDEO_PRIMARY_RATE_LIMIT="5并发"
```

---

## 七、关键架构决策回顾

### 1. 队列模块的"双轨条件加载"
- `apps/backend/src/modules/queue/queue.module.ts` 是 **Dynamic Module**,通过 `QueueModule.forRoot()` 调用
- 检测 `process.env.REDIS_URL`:
  - 有 → 完整 BullMQ providers + 4 个 @Processor
  - 无 → 只暴露 stub `QueueRunnerService`,不实例化任何 BullMQ Queue/Worker
- 解决了:无 Redis 时 ioredis 重连风暴卡死 NestJS 启动的 production blocker

### 2. BullMQ 队列名硬性约束
- BullMQ 5+ 不允许队列名含 `:`(会被识别为 Redis key 分隔符)
- 已改:`creation:shot` → `creation-shot`,`creation:compose` → `creation-compose` 等
- 文件:`apps/backend/src/modules/queue/queue.constants.ts`

### 3. ARK 配置 env 优先级
```typescript
const textPrimaryKey =
  sanitizeEnv(env['ARK_TEXT_PRIMARY_API_KEY']) || BUILTIN_DEFAULTS.textPrimary.apiKey;
```
- env 非空时覆盖硬编码,空/未设时用硬编码
- 这是双刃剑:既能 env override(灵活),也会被 env 上**旧的失效值**覆盖(这次的坑)
- 通过 diagnose 端点新增 `keySource` 字段(`'env' | 'builtin'`)让运维一眼看出实际来源

### 4. LangGraph 4 节点 DAG + 自反思
```
__start__ → orchestrator → material_analysis → script_generation
         → video_composition → quality_control
                                     ↓ (条件边)
                  passed=true → __end__
                  passed=false + retryCount<2 → video_composition (replan)
```
- QualityAgent 把反馈通过 `state.qualityControl.feedback` 传回 ScriptAgent
- ScriptAgent 把反馈拼到下次 prompt:`[上次评估反馈,请规避以下问题]\n${feedback}`

### 5. RAG 爆款脚本知识库结构
- 静态种子:`apps/backend/src/modules/rag/hit-scripts.seed.ts` 当前 9 条
- 检索:按 (category, style) 简单评分,Top-K 注入 prompt
- **未升级到 embedding 检索**(未来优化点)
- 商家高分剧本通过 `ProductSpace.knowledge.bestPractices` 自动沉淀(自学习闭环)

### 6. 三层合规审核
- 第一层:本地词典(广告法极限词 + 医疗禁用语 + 平台规则 + 商家自定义)
- 第二层:LLM 二次复核(score<60 才触发,降本)
- 卡点:Script 生成完即扫描,QualityAgent 评估也扫描,ProductSpace.knowledge.forbiddenWords 扩展词典
- API:`POST /api/compliance/scan` + `POST /api/compliance/scan-shots`

### 7. 端到端 Trace + 成本估算
- 表:`trace_spans`(scope/span/userId/taskId/latencyMs/model/promptTokens/completionTokens/costCents/cacheHit)
- ArkTextService 自动落 trace(在 `try` 成功 + `catch` 失败两处)
- 成本估算:Doubao-Seed input ¥0.0008/k tokens, output ¥0.0024/k tokens;Seedance ¥0.18/5s 视频
- Dashboard 通过 `GET /api/analytics/cost` 获取今日总览

### 8. 前端 Workspace 路由层级
```
/auth/{login,register}                  # 不走 BasicLayout
/workspace                              # 商品空间列表
/workspace/:spaceId/material            # 素材库(P0.7 已接真 API)
/workspace/:spaceId/script              # 剧本工作室(本轮加了 RAG/合规可视化)
/workspace/:spaceId/video               # 视频创作
/workspace/:spaceId/data                # 数据看板(本轮加了 CostOverviewCard)
/workspace/:spaceId/ab                  # A/B 对比(P0.7 已接真任务)
/profile                                # 个人中心
```

---

## 八、关键文件位置速查

### 后端核心模块
- `apps/backend/src/app.module.ts` — 总装入口
- `apps/backend/src/main.ts` — bootstrap + CORS + `/static` 静态托管 + Swagger
- `apps/backend/src/modules/ai/` — ARK 文本/视觉/视频/缓存/配置
- `apps/backend/src/modules/agent/` — LangGraph 编排 + 4 个 Agent
- `apps/backend/src/modules/media/` — FFmpeg/TTS/字幕/BGM/Composer/Storage
- `apps/backend/src/modules/queue/` — BullMQ 双轨队列(forRoot 动态模块)
- `apps/backend/src/modules/trace/` — trace_spans 实体 + 服务
- `apps/backend/src/modules/compliance/` — 合规审核
- `apps/backend/src/modules/rag/hit-scripts.seed.ts` — 爆款种子库

### 前端核心
- `apps/frontend/src/App.tsx` — 路由树
- `apps/frontend/src/pages/script/index.tsx` — 剧本生成页(本轮接入 RAG/合规可视化)
- `apps/frontend/src/pages/dashboard/index.tsx` — 数据看板(本轮接入 CostOverviewCard)
- `apps/frontend/src/components/script/{RagReferenceCard,ComplianceCard}.tsx` — 本轮新增
- `apps/frontend/src/components/dashboard/CostOverviewCard.tsx` — 本轮新增

### 部署配置
- `nixpacks.toml` — Railway 构建,**已加 ffmpeg 系统包**
- `railway.json` — Railway 部署配置
- `apps/frontend/vercel.json` — Vercel SPA rewrites

---

## 九、剩余待办(优先级排序)

### 🔴 立刻必做(下次会话首先做)
1. **完成本轮中断的 build + smoke test 验证** — 确保 task 13~17 的代码无类型错误
2. **commit + push 当前未提交的修改** — 让用户的 Railway 重新部署后能用上新功能
3. **用户那边修复 Railway ARK env**(等待用户操作,我无法替他改 Railway)

### 🟠 本会话还想做但被打断
4. **Task #18 爆款脚本种子库扩充至 25+**(当前 9 条)
   - 文件:`apps/backend/src/modules/rag/hit-scripts.seed.ts`
   - 8 个风格(写实/动画/极简/奢华/清新/动感/复古/科技)× 8 个品类(美妆/3C/服饰/食品/家居/母婴/运动/其他)
   - 每条结构在文件里有 `HitScriptSeed` 接口
5. **Task #19 演示种子数据脚本**
   - 新建 `apps/backend/src/scripts/seed.ts`
   - npm script 加 `"seed": "ts-node src/scripts/seed.ts"`
   - 内容:1 个 demo 商品空间 + 知识库 + 5 个剧本 + 3 个完成任务,让 Dashboard 一上线就有数据

### 🟢 头脑风暴的未来优化(用户在中断前正在让我做)

#### 后端深度
6. **数据库迁移**:关闭 `synchronize`,改用 TypeORM `migration:generate`,`apps/backend/migrations/` 目录
7. **测试体系**:Jest 单测 service 层 + Playwright e2e 跑通登录→生成→下载
8. **错误日志结构化**:接入 pino 替换 console.log,生产更易聚合
9. **WebSocket 任务取消**:目前 cancelFlags 是进程内 Map,跨进程需 Redis pub/sub
10. **embedding-based RAG**:hit-scripts 检索从关键词升级为 BGE-M3 向量

#### 差异化创新点(P2)
11. **爆款拆解(参考视频反向工程)**:用户粘贴 TikTok 爆款链接 → 抽帧 → ARK 视觉理解 → 模板化套到自家商品
12. **角色 / 品牌视觉一致性**:Composition Agent 已经接收 firstFrameUrl,需让首镜定主体后续分镜延续
13. **前 3s 留存预测**:训练简单回归或用 LLM 给 hook 打"留存潜力分",生成 N 个候选选最高分
14. **A/B 实验闭环**:一个剧本生成 2 个版本不同 hook,真实跑指标对比
15. **Embedding 缓存**:Material 视觉理解的 caption 已经生成,可加一层 embedding 落库做更精准检索

#### Demo 演示加分(P4)
16. **docker-compose 一键启动**:pg + redis + minio + backend + frontend
17. **演示视频**:90s 端到端走查录屏嵌入 README
18. **架构图**:mermaid/excalidraw 画 4 张(总体/Agent DAG/合片管线/数据飞轮)
19. **手动撰写 5~10 条评测样例 prompt**,演示时一键预填

#### 工程质量
20. **限流加细分**:目前是全局限流,可对 `/script/generate` 这种重操作单独限制(如 5 次/分钟)
21. **健康检查增强**:`/api/health` 加返回 ARK 是否可达 / Redis 是否可达 / FFmpeg 是否可用
22. **错误页**:前端 ErrorBoundary 当前比较简陋,可加 Sentry 上报

---

## 十、关键命令速查

### 本地启动
```bash
# 后端(端口 3001)
cd apps/backend && npm install --legacy-peer-deps && npm run start:dev

# 前端(端口 3000)
cd apps/frontend && npm install --legacy-peer-deps && npm run dev
```

### 验证 ARK Key 有效性(curl 直测)
```bash
curl -s -X POST 'https://ark.cn-beijing.volces.com/api/v3/chat/completions' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ark-0a0ae159-729d-4b5d-9c2d-a5bf04824ff5-d42e3' \
  -d '{"model":"ep-20260514115629-vhldw","messages":[{"role":"user","content":"ping"}],"max_tokens":5}'
```

### Type-check + Build
```bash
cd apps/backend && npx tsc --noEmit && npm run build
cd apps/frontend && npx tsc --noEmit && npm run build
```

### Smoke test(无 PG/Redis,验证启动不卡死)
```bash
cd apps/backend
PORT=13455 NODE_ENV=production \
  DATABASE_URL=postgres://invalid:invalid@127.0.0.1:65432/x \
  npm run start:prod &
sleep 6
curl -sf http://localhost:13455/api/health  # 应返回 200
kill %1
```

### 部署后验证(用户视角)
```bash
# 健康检查
curl https://<railway-domain>/api/health

# ARK 诊断(本轮新加 keySource 字段)
# 需先登录拿 token
curl -H "Authorization: Bearer <token>" https://<railway-domain>/api/ai/ark/diagnose
```

---

## 十一、本会话最后未完成的具体动作

**用户中断时的操作**(被取消的 Bash 命令):
```bash
cd /Users/laurantwang/Code/VidForge/apps/backend && npm run build 2>&1 | tail -3
echo "===FRONTEND==="
npx tsc --noEmit 2>&1 | head -5; echo "(empty=ok)"
echo "===STARTUP==="
PORT=13455 NODE_ENV=production DATABASE_URL=postgres://invalid:invalid@127.0.0.1:65432/x npm run start:prod &
PID=$!
sleep 6
kill $PID 2>/dev/null
```

这是为验证最后两个修复(orchestrator `as AgentState` 类型断言 + script/index.tsx 删除冗余 `ShotItem` 接口)。

**新会话恢复步骤**:
1. 读本文件 + `docs/项目记忆.md`
2. 跑上面的验证命令
3. 若 build pass,做 commit + push
4. 继续 Task #18(种子库扩充)与 #19(seed 脚本)
5. 完成后再做头脑风暴

---

## 十二、与用户对话风格备忘

- 用户使用**简体中文**
- 习惯节奏:用户单次问一件事,我做完就 stop;不要堆砌过多的"假设你想要..."
- 用户重视**真实可演示**而非"看起来全",Stub 与 Mock 是大忌
- 用户重视**部署可验证**(他在 Railway+Vercel 上真实跑)
- 比赛背景:**不要直接出现"比赛"两字在文档里**,但所有差异化决策可以围绕这个目标
- 用户的字节背景导致**优先用火山生态**(ARK / 字节 OpenSpeech)是天然加分项

---

## 十三、最后给新会话 Claude 的一句话

> 你在续接一个**真实部署中的字节 AI 全栈比赛参赛项目**,V2 大改造的代码已经能跑通,但**最后 5 项小修改未 commit/未推送**;用户的 Railway 上有失效的 ARK env 覆盖了硬编码默认值,**已经告诉用户怎么改但用户尚未操作**;请先跑 build 验证 → commit/push → 然后续做 Task #18 #19 → 再头脑风暴。
