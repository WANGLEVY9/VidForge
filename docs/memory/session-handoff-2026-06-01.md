# VidForge 会话续接文档(Session Handoff)— 2026-06-01

> **生成时间**:2026-06-01,本次会话即将因终端乱码重启
> **目的**:让下一个 Claude 会话快速接上上下文,不要压缩任何关键细节
> **新会话首次读取顺序**:本文件 → `docs/session-handoff-2026-05-31.md`(上次档案,更老的全景) → `README.md` → `docs/项目记忆.md` → `docs/占位符记录.md`

---

## 0. 你正在续接什么(给新 Claude 的电梯陈述)

VidForge 是一个**真实部署中**的 AIGC 带货视频生成全链路系统(字节 AI 全栈比赛参赛项目,但比赛字眼**不要出现在任何项目文档/代码里**),前端 Vercel + 后端 Railway,公开 URL `https://vid-forge-frontend-nu.vercel.app`,GitHub 私有仓库 `git@github.com:WANGLEVY9/VidForge.git`。

本次(2026-06-01)会话已经做了 3 件大事,**前 2 件已 commit + 已 push**(`3f22616` / `b118ad8`),**第 3 件代码已落盘但用户明确要求由他自己 commit + push**——所以你看到工作区里有未提交的 8 个改动 + 2 个新文件,**不要替用户提交**。

---

## 1. 强约束(非常重要,别违反)

1. **不要替用户执行 `git commit` / `git push` / `git tag`**,本次会话已被用户明确要求"后续请不要帮我执行代码提交和推送,我自己执行"
2. **不要在文档/代码/UI 里直接出现"比赛"两字**,可以围绕"参赛能脱颖而出"做决策,但表述要保持产品语
3. **优先用火山方舟(ARK / Doubao)**生态,这是字节 AI 比赛的天然加分项
4. **私有仓库**,API key 可以硬编码到代码里;但 DB 中的 override key 当前是明文存储,生产化前需要加密(已在代码注释里 TODO)
5. 用户用**简体中文**沟通,响应风格简洁,做完即停,不要堆砌"假设你想要..."

---

## 2. 本次会话(2026-06-01)做了什么

### 阶段 A:ARK Key 黑名单兜底(已 commit `3f22616`,已 push)

**问题**:Railway env 上残留的旧 ARK key (`ark-f26df94a-...-dd663`)失效,但 env > builtin 的优先级让线上一直拿失效 key 调 ARK,所有调用 fallback 到示例剧本。

**修复**(`apps/backend/src/modules/ai/config/ark.config.ts`):
- 新增 `KNOWN_DEAD_KEYS: ReadonlySet<string>` 黑名单(目前包含上述失效 key)
- env 上的 key 命中黑名单时,**自动忽略 env,回落到代码内置默认值**
- `ArkModelConfig.apiKeySource` 字段新增 `'builtin-fallback'` 一项(后续 阶段 B 又加了 `'db'`)
- `ArkConfigService.onModuleInit` 启动日志清晰打印 `apiKeySource=builtin-fallback envBlocked=ark-...d663`,命中时单独 WARN 提示运维清理 env
- `/api/ai/ark/diagnose` 端点回包新增 `envBlocked` + `blockedEnvKey` 字段
- 同 commit 把第 5 轮(2026-05-31)累积的 17 项前端/后端改动一起入库(ARK 缓存 / 限流 / 任务取消 / RAG 飞轮 / 前端 RAG/合规/成本可视化)

**验证状态**:本地三场景脚本测试已通过(失效 env 屏蔽 / 无 env 走 builtin / 合法 env 仍可覆盖)。

---

### 阶段 B:顶栏三大体验完善(已 commit `b118ad8`,已 push)

针对用户反馈的 3 个 UX 问题:通知按钮无响应、浅色模式破损、API Tag 静态无功能。

#### B1. 通知中心(全新,前后端联动)

后端新增 `NotificationModule`:
- `apps/backend/src/modules/notification/entities/notification.entity.ts` — `notifications` 表
  - `userId: uuid | null`(null = 全员广播)
  - `type: 'system' | 'task' | 'compliance' | 'tip'`
  - `title / content / link / read / createdAt`
- `notification.service.ts` 提供 `create / list / unreadCount / markRead / markAllRead / remove`,**onApplicationBootstrap 启动种子注入 3 条系统广播**(空表时):欢迎、合规、数据看板
- `notification.controller.ts` REST 端点:
  - `GET /api/notifications?page&pageSize&unread`
  - `GET /api/notifications/unread-count`
  - `POST /api/notifications/:id/read` / `read-all`
  - `DELETE /api/notifications/:id`
  - **简化决策**:广播通知不参与已读状态(避免 notification_reads 关联表),Badge 未读数 = 当前用户 personal 通知 unread 数

前端新增:
- `apps/frontend/src/services/notification.ts` — REST 封装
- `apps/frontend/src/store/useNotificationStore.ts` — zustand,乐观更新 + 60s 轻量轮询未读数
- `apps/frontend/src/components/layout/NotificationCenter.tsx` — Popover 380px,Tabs(全部/未读)+ 列表项(类型图标 + 未读小红点 + 相对时间)+ 顶部"全部已读"

#### B2. API 配置中心(全新,可改 ARK key 并落库)

后端新增 `ArkModelOverride` entity(`apps/backend/src/modules/ai/entities/ark-model-override.entity.ts`):
- 主键 `modelKey`('text-primary' / 'video-primary')
- 字段 `endpointId / apiKey / updatedBy / createdAt / updatedAt`

`ArkConfigService` 大改:
- 第一阶段 `onModuleInit` 仅基于 env+builtin 加载(同步)
- 第二阶段 `onApplicationBootstrap` 从 DB 读 override 应用(异步,此时 TypeORM 已建表)
- **优先级:DB override > env(若不在黑名单)> 代码内置 builtin**
- 新增 `setOverride(modelKey, payload, userId)`:写 DB + 更新内存 + 标记 `apiKeySource='db'`
- 新增 `clearOverride(modelKey)`:删 DB 行 + 重新走 env+builtin

`AiController` 加端点:
- `PATCH /api/ai/ark/configs/:key` body `{ endpointId?, apiKey? }`
- `DELETE /api/ai/ark/configs/:key/override`
- 任意登录用户都可改(注释里 TODO:接入 admin role)

前端新增 `apps/frontend/src/components/layout/ApiStatusCenter.tsx`:
- 替换 BasicLayout 中静态 Tag,Tag 加 Tooltip 实时显示主模型状态摘要,点击打开 480px Drawer
- Drawer 显示文本/视频两个模型卡片(endpoint / 脱敏 key / source 标签 / 限速)
- Ping 按钮发最小 ARK 请求实测连通性
- 编辑 Modal 让用户改 endpoint/apiKey 写入 DB
- 清除按钮回落到 env/builtin
- envBlocked 时显式 Alert 提醒清理部署平台 env
- `apps/frontend/src/services/ai.ts` 加 `updateConfig` / `clearOverride`

#### B3. 浅色模式修复(关键改动)

- `apps/frontend/src/styles/tokens.css` 增加 `--header-bg` / `--sidebar-bg` / `--tab-bar-bg`,light-mode 覆盖
- `apps/frontend/src/layouts/BasicLayout.tsx`:header 背景改用 `var(--header-bg)`,Menu 的 `theme` 跟随 `useTheme().isDark` 动态切换
- `apps/frontend/src/components/layout/TopBar.tsx` / `FabButton.tsx`:移除硬编码 `rgba(15,15,19,...)`
- `apps/frontend/src/styles/glassmorphism.css`:`.glass-tab-bar` 加 light-mode 覆盖
- **关键**:`apps/frontend/src/main.tsx` 把 Antd `ConfigProvider` 抽出为 `ThemedAntApp` 组件,`algorithm` 跟随 `useTheme()` 实时切换 — **这是浅色模式下 Antd 内置组件(Modal/Dropdown/Card 等)不变色的根因**,之前 ConfigProvider 在 main 里只读取一次 dark-mode class

---

### 阶段 C:剧本→视频流转 + 分镜级预览/下载(**已落盘,未 commit,未 push,等用户自己提交**)

#### C1. 用户痛点

1. 剧本页生成完成后只 `message.success`,没引导;用户必须去视频页**重新输入主题再调一次 LLM 生成分镜**(浪费 ARK 配额 + 心智断层)
2. 视频生成完后,后端 `result.shots[]` 实际有每个分镜独立 videoUrl,但:
   - `ShotItem` 缩略图只渲染静态占位图标,看不到真实视频
   - `complete` 阶段直接把 `StoryboardEditor` 整个隐藏,只剩合成版,**无法看 / 播 / 下载任何单分镜**

#### C2. 解决方案(已实施)

**新文件**:
- `apps/frontend/src/store/useScriptHandoffStore.ts` — 跨页面剧本交付 zustand store,`pending: { script, prompt, spaceId, createdAt }`,提供 `setPending / consume(取出并清空) / clear`
- `apps/frontend/src/utils/download.ts` — `triggerDownload(url, filename)` 走 fetch+Blob 强制下载;失败回退 `openInNewTab`(应对 CORS)

**修改文件**:
- `apps/frontend/src/pages/script/index.tsx` — 生成成功后渲染**「剧本已就绪 · 一键合成视频」CTA 卡片**(主按钮"前往视频生成 →" 写入 handoff + navigate;次按钮"保存剧本"复用 handleSave);fallback 模式仍可流转但文案警示
- `apps/frontend/src/pages/creation/index.tsx`:
  - 抽出 helper `mapShotsToStoryboardItems(shots, fallbackDuration)`,被两条路径(prompt 调 LLM 生成 / handoff 带入)复用
  - mount 时 `consumeHandoff()`,有数据时填充表单 prompt + 设置 duration + setStoryboard + setCurrentStep('storyboard'),顶部蓝色 Alert "已从剧本页带入「xxx」共 N 个分镜"
  - **重构 `complete` 阶段**:顶部成功摘要卡片(✅ + 编辑分镜/重新创作按钮);中部 Row(左 lg=14:合成视频预览 + 复制地址;右 lg=10:导出 + 「下载合成版」直链下载 mp4);**下方挂只读 StoryboardEditor 当作"分镜结果浏览器"**
- `apps/frontend/src/components/storyboard/ShotItem.tsx` — `status==='completed' && videoUrl` 时缩略图改为真实 `<video muted preload="metadata">`,**hover 时 play(),mouseleave 时 pause()+currentTime=0**(类 TikTok 体验);actions 区加「下载本分镜」按钮;支持 `readonly` 隐藏拖拽/删除/重新生成
- `apps/frontend/src/components/storyboard/ShotDetailPanel.tsx` — `readonly` 时渲染只读视图(描述/台词/标签 + "下载本分镜"/"在新标签打开" 两按钮);可编辑模式底部也加了下载按钮
- `apps/frontend/src/components/storyboard/StoryboardEditor.tsx` — `readonly` prop 透传给 ShotList / ShotDetailPanel,且在只读模式下禁用 Cmd+D / Delete / Cmd+Enter 等编辑快捷键
- `apps/frontend/src/components/storyboard/ShotList.tsx` — `readonly` 透传到 ShotItem,且禁用拖拽/添加按钮
- `apps/frontend/src/components/storyboard/storyboard.css` — `.shot-item__thumb-overlay` hover 显示

#### C3. 验证状态

- `npx tsc --noEmit` ✅ 干净
- `npm run build` ✅ 通过(前端无新警告)
- **未 commit,未 push,等用户自己执行**

---

## 3. 当前 git 工作区状态(关键!)

最后已推送 commit:**`b118ad8`** (顶栏三大体验完善)。

工作区有以下未提交修改,**全部属于阶段 C**:

```
 M .claude/settings.local.json                                            ← 不要提交
 M apps/frontend/src/components/storyboard/ShotDetailPanel.tsx
 M apps/frontend/src/components/storyboard/ShotItem.tsx
 M apps/frontend/src/components/storyboard/ShotList.tsx
 M apps/frontend/src/components/storyboard/StoryboardEditor.tsx
 M apps/frontend/src/components/storyboard/storyboard.css
 M apps/frontend/src/pages/creation/index.tsx
 M apps/frontend/src/pages/script/index.tsx
?? apps/frontend/src/store/useScriptHandoffStore.ts
?? apps/frontend/src/utils/download.ts
```

**用户会自己提交,你不要碰**。如果用户问起,可以告诉他建议的 commit message:

```
feat(handoff): 剧本→视频一键流转 + 分镜级预览/下载

- 新增 useScriptHandoffStore 跨页面剧本交付,消费即清空
- 剧本页生成成功后渲染「一键合成视频」CTA 卡片
- 视频页 mount 时消费 handoff,自动填充 storyboard 跳过 LLM 二次调用
- ShotItem 缩略图改为真实 video hover 自动播放预览
- 加分镜级下载按钮(triggerDownload 走 fetch+Blob 强制下载)
- StoryboardEditor 加 readonly 模式,底部组件透传
- complete 阶段重构:顶部摘要 + 合成版预览/下载 + 只读 storyboard 浏览器
```

---

## 4. 关键架构与决策(本会话新增)

### 4.1 ARK key 优先级最终形态

```
DB override(ark_model_overrides 表)> env(若不在 KNOWN_DEAD_KEYS)> builtin
                                          ↓ 命中黑名单
                                       忽略 env,走 builtin-fallback
```

`ArkModelConfig.apiKeySource` 取值:`'db' | 'env' | 'builtin' | 'builtin-fallback'`,前端 ApiStatusCenter Drawer 用 `SOURCE_META` 把每种映射成颜色 Tag。

### 4.2 通知中心数据模型

广播通知用 `userId=null` 表示,前端 list 同时拉自己的 personal + 所有广播。**广播不计入未读数,不允许已读/删除**。这避免了引入 `notification_reads` 关联表。

### 4.3 跨页面剧本交付(handoff store)

```ts
useScriptHandoffStore {
  pending: { script, prompt, spaceId, createdAt } | null
  setPending(script, prompt, spaceId)
  consume(): 取出并清空,returns 当时的值
  clear()
}
```

视频页 mount 时调 `consume()` 一次,刷新页面后 store in-memory pending=null,不会重复带入旧剧本。

### 4.4 Antd 主题切换的关键

`ConfigProvider` 必须在**组件内部**用 `useTheme()` 实时驱动 algorithm,不能放在 `ReactDOM.createRoot` 同级。本次已在 `main.tsx` 抽出 `ThemedAntApp`。

---

## 5. 已知问题 / 用户视角的潜在卡点

1. **Railway env 仍然残留失效 key**:用户尚未删除 Railway 上的 `ARK_TEXT_PRIMARY_API_KEY` / `ARK_VIDEO_PRIMARY_API_KEY`(失效值 `ark-f26df94a-...-dd663`),目前靠代码黑名单兜底,功能不受影响,但启动日志会有 WARN。**建议清理 env 但不强求**(代码已自动 fallback)
2. **下载 CORS**:对象存储如果未配 CORS,`triggerDownload` 会自动回退到打开新标签让用户右键保存。生产部署时建议给 OSS / Railway static 都加 `Access-Control-Allow-Origin`
3. **ARK override 安全**:任何登录用户都能改 key(目前没有 role 系统),编辑 Modal 里有提示 "TODO: 后续接入管理员角色"。生产前必须加 admin role 守卫
4. **NotificationModule 启动种子失败处理**:onApplicationBootstrap 里 try/catch 失败时 warn 不抛异常 — DB 没建表也不会阻塞应用启动

---

## 6. 用户已实测通过的能力

用户在本次会话中已经实测:
- ✅ **剧本生成**:Railway 上 ARK 已能跑通真实 Doubao 文本模型(在阶段 A 之后),用户已经亲自跑过一次完整剧本生成
- ⏳ **分镜/视频生成**:用户在结束前正在等待视频生成结果(没等到分镜完成就发现了阶段 C 的两个 UX 问题)
- ⏳ **阶段 C 未自测**:剧本→视频流转和分镜级预览下载是基于代码静态推理实现的,**用户尚未跑通端到端验证**,新会话续接后应该提醒用户实测一遍

---

## 7. 给新会话的"开机第一件事"

1. **先读本文件**,然后读 `docs/session-handoff-2026-05-31.md`(更老的全景)、`README.md`、`docs/项目记忆.md`
2. 跑 `git status` + `git log --oneline -5` 验证工作区状态匹配本文档第 3 节
3. **不要替用户提交工作区里的阶段 C 改动**
4. 询问用户:"上次的剧本→视频流转和分镜级预览下载已经落地但未提交,你要先实测一下端到端吗?还是直接继续别的工作?"
5. **可能的下一步任务**(用户中断前未说,但根据上次档案 #18 #19 还有):
   - Task #18:`apps/backend/src/modules/rag/hit-scripts.seed.ts` 从 9 条扩到 25+
   - Task #19:新建 `apps/backend/src/scripts/seed.ts` 演示种子数据脚本
   - 阶段 C 实测发现的 bug 修复

---

## 8. 关键文件位置速查(本次新增/重要修改)

### 后端
- `apps/backend/src/modules/notification/` — 整个目录新建(B1)
- `apps/backend/src/modules/ai/entities/ark-model-override.entity.ts` — B2 新建
- `apps/backend/src/modules/ai/services/ark-config.service.ts` — async init + DB 加载 + setOverride/clearOverride
- `apps/backend/src/modules/ai/ai.controller.ts` — PATCH/DELETE 端点 + diagnose 用 keySource
- `apps/backend/src/modules/ai/config/ark.config.ts` — KNOWN_DEAD_KEYS 黑名单 + apiKeySource 字段

### 前端
- `apps/frontend/src/store/useScriptHandoffStore.ts` — C 新建
- `apps/frontend/src/store/useNotificationStore.ts` — B1 新建
- `apps/frontend/src/utils/download.ts` — C 新建
- `apps/frontend/src/services/notification.ts` — B1 新建
- `apps/frontend/src/services/ai.ts` — 加 updateConfig / clearOverride
- `apps/frontend/src/components/layout/NotificationCenter.tsx` — B1 新建
- `apps/frontend/src/components/layout/ApiStatusCenter.tsx` — B2 新建
- `apps/frontend/src/components/storyboard/ShotItem.tsx` — C 改:hover 视频预览 + 下载按钮 + readonly
- `apps/frontend/src/components/storyboard/ShotDetailPanel.tsx` — C 改:readonly 模式
- `apps/frontend/src/components/storyboard/StoryboardEditor.tsx` — C 改:readonly 透传
- `apps/frontend/src/components/storyboard/ShotList.tsx` — C 改:readonly 透传
- `apps/frontend/src/layouts/BasicLayout.tsx` — B 改:Bell + Tag 替换 + Menu theme 动态 + header 用 token
- `apps/frontend/src/main.tsx` — B 改:ThemedAntApp 包裹 ConfigProvider
- `apps/frontend/src/pages/script/index.tsx` — C 改:CTA 卡片 + handleGoToVideo
- `apps/frontend/src/pages/creation/index.tsx` — C 改:消费 handoff + complete 阶段重构 + readonly storyboard

### 样式
- `apps/frontend/src/styles/tokens.css` — B3 加 --header-bg / --sidebar-bg / --tab-bar-bg
- `apps/frontend/src/styles/glassmorphism.css` — B3 .glass-tab-bar light 覆盖
- `apps/frontend/src/components/storyboard/storyboard.css` — C 加 .shot-item__thumb-overlay hover

---

## 9. 关键命令

### 本地启动
```bash
cd apps/backend && npm install --legacy-peer-deps && npm run start:dev   # 后端 3001
cd apps/frontend && npm install --legacy-peer-deps && npm run dev        # 前端 3000
```

### 验证 ARK key
```bash
# 内置有效 key
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

### 部署后验证
```bash
# 健康检查
curl https://<railway-domain>/api/health
# 通知未读数(需 token)
curl -H "Authorization: Bearer <token>" https://<railway-domain>/api/notifications/unread-count
# ARK 诊断(需 token)
curl -H "Authorization: Bearer <token>" https://<railway-domain>/api/ai/ark/diagnose
```

---

## 10. 用户对话风格备忘(承自上次档案,继续生效)

- 简体中文,做完即停
- 重视"真实可演示",Stub / Mock 是大忌
- 重视部署可验证(他在 Railway+Vercel 真实跑)
- 比赛字眼**不要直接出现**在文档/代码里
- 字节背景导致**优先用火山生态**(ARK / 字节 OpenSpeech)
- 用户终端环境偶尔会乱码需要重启 — 这是为何要写本档案

---

## 11. 一句话总结给新 Claude

> 你在续接一个**真实部署中的 AI 全栈项目**,本会话(2026-06-01)做了 3 件大事:ARK Key 黑名单兜底已 push、通知中心+API 配置中心+浅色模式已 push、剧本→视频流转+分镜级预览下载**代码已落盘但未提交**(用户自己提交)。**绝对不要替用户 commit/push**,先帮用户实测阶段 C 的端到端流程。
