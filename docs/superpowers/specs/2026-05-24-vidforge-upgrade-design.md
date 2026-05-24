# VidForge 全面升级设计方案

## 概述

- **项目**: 电商场景 AIGC 带货视频生成系统
- **设计方向**: 创意工作室风格（暗色沉浸式）
- **升级策略**: 模块级重构，保留 Ant Design 底层，自定义上层组件体系
- **实施策略**: 四阶段迭代，由核心到外围

---

## 一、设计系统与视觉基础

### 1.1 色彩体系

**深色模式（主模式）：**
```
背景层:      #0f0f13 (深邃黑)
表层面:      #1a1a23 (卡片/面板)
次级面:      #24242f (输入框/次级面板)
分割线:      rgba(255,255,255,0.06)

品牌渐变主色: #6366f1 → #a855f7 → #d946ef
强调色:      #06b6d4 → #22d3ee (青蓝点缀)
成功:        #10b981
警告:        #f59e0b
错误:        #ef4444
信息:        #3b82f6

文字主色:    rgba(255,255,255,0.90)
文字次级:    rgba(255,255,255,0.65)
文字三级:    rgba(255,255,255,0.40)
文字禁用:    rgba(255,255,255,0.20)
```

**亮色模式（辅助模式，主要为移动端适配）：**
```
背景层:      #f8fafc
表层面:      #ffffff
次级面:      #f1f5f9
分割线:      #e2e8f0
文字主色:    #1e293b
文字次级:    #64748b
品牌色保持不变
```

### 1.2 视觉特征

1. **玻璃拟态（Glassmorphism）**: 侧边栏、浮动面板使用 `backdrop-filter: blur(20px)` + 半透明背景
2. **微动效系统**: 页面切换 fade-slide（300ms）、卡片悬浮 lift（200ms）、进度脉冲动画
3. **三层阴影系统**: 卡片层（微弱）、浮动层（中等）、模态层（重影），数值随模式切换调整
4. **圆角体系**: sm=6px, md=8px, lg=12px, xl=16px, xxl=24px

### 1.3 组件架构

```
Ant Design v5 (底层 UI 库)
    ↓ 主题覆盖 ConfigProvider
VidForge Design Tokens (自定义变量)
    ↓ 组合
Studio Components (自定义组件层)
  ├── GlassPanel       — 玻璃拟态容器
  ├── StudioLayout     — 三栏/双栏工作室布局
  ├── Timeline         — 视频时间轴
  ├── MediaGrid        — 媒体库网格
  ├── StoryboardItem   — 分镜卡片
  ├── PreviewPlayer    — 视频预览播放器
  ├── ProgressTracker  — 生成进度追踪
  └── A/BCompare       — 对比视图
    ↓ 组合
Page Modules (页面模块)
  ├── DataStudio       — 数据工作台
  ├── MediaLibrary     — 素材媒体库
  ├── ScriptStudio     — 剧本工作室
  └── VideoStudio      — 视频工作室
```

### 1.4 暗色模式架构

- 使用 CSS 自定义属性 (variables) 实现主题切换
- 通过 Ant Design ConfigProvider 的 `theme` 属性统一覆盖
- 定义 `.light-mode` / `.dark-mode` 作用域类名，全局切换
- 默认加载暗色模式，亮色模式通过用户切换或系统偏好检测触发

---

## 二、页面重构方案

### 2.1 数据工作室（原工作台 /dashboard）

**布局结构：**
```
┌─────────────────────────────────────────────┐
│  欢迎区（渐变色块 + 动态数据）                 │
├──────────┬──────────┬──────────┬─────────────┤
│ 素材总量  │ 剧本数量  │ 视频产出  │ 今日新增    │
├──────────┴──────────┴──────────┴─────────────┤
│  快速操作栏（4 个大卡片，hover 扩展动画）       │
├───────────────────────┬─────────────────────┤
│  创作趋势图（折线面积） │  品类分布（环形饼图）   │
├───────────────────────┴─────────────────────┤
│  最近创作（Timeline 时间线风格）               │
└─────────────────────────────────────────────┘
```

**交互升级：**
- 欢迎区数据卡片实时跳动更新（数值变化动画）
- 快速操作卡片 hover 时展开更多信息
- 图表支持时间范围拖动筛选
- 最近创作列表支持状态筛选 + 一键跳转到创作页

### 2.2 媒体库（原素材库 /material）

**布局结构：**
```
┌─────────────────────────────────────────────┐
│  搜索栏 │ 标签筛选 (Pills) │ 视图切换 │ 上传   │
├─────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────┐  │
│  │ 素材网格 (瀑布流)    │  │ 智能分析侧栏    │  │
│  │                    │  │ (选中后展开)    │  │
│  │                    │  │ - AI 标签       │  │
│  │                    │  │ - 相似素材      │  │
│  │                    │  │ - Embedding     │  │
│  └────────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────┘
```

**交互升级：**
- 智能分析侧栏：选中素材后右侧展开，展示 AI 提取的三层标签、关联素材推荐
- 上传融入页面：不再使用独立 Dragger，改为页面内嵌上传区域
- 搜索增强：支持语义搜索 + 传统关键词混合
- 视图模式：网格 / 列表 / 详情三模式

### 2.3 剧本工作室（原剧本创作 /script）

**布局结构：**
```
┌──────────────────────┬────────────────────────┐
│  左侧配置面板          │  右侧结果面板           │
│  ────────────────     │  ─────────────────     │
│  商品名称 _____       │  剧本标题（成功 Alert）  │
│  品类    [ ▼ ]       │  ┌─ 分镜脚本 ────────┐ │
│  卖点    _____       │  │ 0-3s  黄金开头 ...  │ │
│  人群    [tags]       │  │ 3-10s 产品引入 ...  │ │
│  ────────────────     │  │ 10-25s 效果展示 ... │ │
│  风格选择（6宫格）     │  │ 25-35s 实测证明 ... │ │
│  时长 Slider          │  └──────────────────┘ │
│  附加选项             │  配音建议 / BGM / 标签  │
│  [生成剧本] [一键成片]  │                       │
└──────────────────────┴────────────────────────┘
```

**交互升级：**
- 左侧配置栏加入折叠式分组，减少表单压迫感
- 分镜结果采用卡片瀑布流，每条分镜独立卡片带颜色标识类型
- 支持内联编辑：点击分镜内容直接修改
- 新增"保存为模板"功能，将当前剧本保存到模板库

### 2.4 视频工作室（原创作页 /creation）

**布局结构（三栏 + 底部时间轴）：**
```
┌──────────┬───────────────────────┬──────────────┐
│ 配置面板  │     预览区             │ 分镜详情面板  │
│          │                       │              │
│ 视频主题  │   ┌─────────────┐    │ 分镜 01 参数  │
│ AI 模型  │   │  9:16 预览   │    │ Prompt: ...  │
│ 画面比例  │   │  播放器      │    │ 素材: ...    │
│ 画质     │   │  ▶ 进度条    │    │ 时长: 5s     │
│ 时长     │   └─────────────┘    │ 台词: ...    │
│ 配音/字幕 │                       │              │
│ BGM      │                       │ [重生成]     │
│          │                       │ [替换素材]    │
├──────────┴───────────────────────┴──────────────┤
│  底部时间轴                                     │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐   │
│  │ 01   │ 02   │ 03   │ 04   │ 05   │ ...  │   │
│  │ 5s   │ 8s   │ 6s   │ 5s   │ 3s   │      │   │
│  └──────┴──────┴──────┴──────┴──────┴──────┘   │
└──────────────────────────────────────────────────┘
```

**交互升级：**
- 三栏面板均可调整宽度（拖拽分隔线）
- 配置面板内选项变化即时反映到预览区
- 时间轴支持拖拽排序、缩放、点击定位
- 分镜详情面板内可直接修改所有参数
- "一键成片"入口始终悬浮在右下角

---

## 三、分镜编辑器（核心组件）

### 3.1 组件层级

```
StoryboardEditor (容器)
├── ShotList (左栏 - 分镜列表)
│   ├── ShotItem (单个分镜卡片，拖拽手柄 + 缩略图 + 信息)
│   └── AddShotButton (添加分镜)
├── PreviewPanel (中栏 - 预览区)
│   ├── VideoPlayer (视频播放器)
│   ├── TimelineProgress (当前进度条)
│   └── PlaybackControls (播放控制按钮组)
├── ShotDetailPanel (右栏 - 分镜详情)
│   ├── PromptEditor (画面描述编辑)
│   ├── MaterialSelector (素材选择器)
│   ├── DurationSlider (时长调整)
│   ├── ScriptEditor (台词编辑)
│   └── ActionButtons (重生成/替换/删除)
└── TimelineBar (底部 - 时间轴)
    ├── TimelineTrack (时间轨道)
    ├── ShotBlocks (分镜色块)
    ├── Playhead (播放头)
    └── TimeRuler (时间刻度)
```

### 3.2 交互能力清单

| 操作 | 触发方式 | 行为 |
|------|---------|------|
| 排序 | 拖拽 ShotItem | 重排后 TimelineBar 自动更新 |
| 选中 | 点击 ShotItem / TimelineBlock | PreviewPanel 跳转 + ShotDetailPanel 载入 |
| 编辑 | ShotDetailPanel 内表单 | 实时保存，不打断播放 |
| 复制 | Cmd/Ctrl + D 或右键菜单 | 在选中分镜后插入副本 |
| 删除 | Delete 键或右键菜单 | 带确认，播放头自动定位到前一个分镜 |
| 添加 | 点击 AddShotButton | 在末尾追加空白分镜 |
| 重生成 | ShotDetailPanel 内按钮 | 仅重新生成该分镜，其他不变 |
| 替换素材 | ShotDetailPanel 内素材选择器 | 弹出媒体库选择器浮层 |
| 调整时长 | ShotDetailPanel 内 Slider | TimelineBar 同步更新块宽度 |
| 预览播放 | Space 键或点击 PreviewPanel | 从当前分镜开始顺序播放 |

### 3.3 状态定义

```typescript
interface StoryboardState {
  shots: Shot[];
  activeShotId: string | null;
  playbackState: 'idle' | 'playing' | 'paused';
  currentTime: number; // 当前播放时间 (秒)
  isDragging: boolean;
}

interface Shot {
  id: string;
  order: number;
  description: string;
  duration: number; // 秒
  type: 'text-to-video' | 'image-to-video';
  referenceMaterialId?: string;
  script: string; // 台词
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
}
```

### 3.4 快捷键系统

| 快捷键 | 功能 |
|--------|------|
| Space | 播放/暂停 |
| ← / → | 上一个/下一个分镜 |
| Cmd/Ctrl + D | 复制当前分镜 |
| Delete | 删除当前分镜 |
| Cmd/Ctrl + Z | 撤销（拖拽/编辑） |
| Cmd/Ctrl + Enter | 开始生成 |

---

## 四、素材智能链路

### 4.1 三层标签体系

| 层级 | 粒度 | 提取方式 | 存储结构 |
|------|------|---------|---------|
| **商品层** | 整组素材 | LLM 分析商品主图/描述 | `{ category, brand, priceRange, style }` |
| **视频层** | 单个文件 | LLM 分析视频内容 + 标题 | `{ summary, style, mood, sceneTags }` |
| **切片层** | 帧/片段 | 视觉理解 + 物体检测 | `{ objects, colors, composition, text }` |

### 4.2 素材入库流程

```
上传 → 格式校验 → 缩略图生成 → LLM 多模态分析 → 三层标签提取 → 
Embedding 生成 (Phase 2) → 存储 (PostgreSQL + 向量库)
```

### 4.3 检索能力

| 检索方式 | Phase | 实现 |
|---------|-------|------|
| 关键词匹配 | 1 | PostgreSQL ILIKE + 标签索引 |
| 标签过滤 | 1 | 标签数组 GIN 索引 |
| 语义检索 | 2 | Embedding + 向量相似度 (PGVector/Milvus) |
| 以图搜图 | 2 | 图片 Embedding → 向量检索 |

### 4.4 前端交互

- 搜索框：支持自然语言输入（"夏日清爽感白底图"）
- 筛选器：类目 + 类型 + 标签 + 颜色多维度
- 智能推荐：在剧本/创作页面自动推荐匹配素材

---

## 五、系统架构升级

### 5.1 后端模块扩展

```
apps/backend/src/modules/
├── ai/              (现有 - 火山引擎 API 封装)
├── material/        (新建 - 素材 CRUD + 标签 + Embedding)
├── script/          (新建 - 剧本生成 CRUD + 模板)
├── creation/        (新建 - 视频任务调度 + 渲染)
├── agent/           (新建 - LangGraph 工作流编排)
├── analytics/       (新建 - 数据统计 + 归因)
└── common/          (现有 - 通用模块)
```

### 5.2 Agent 编排架构

```
用户请求
  │
  ▼
Orchestrator Agent (LangGraph)
  │
  ├── Material Analysis Agent
  │   ├── 智能素材匹配
  │   └── 标签补充
  │
  ├── Script Generation Agent
  │   ├── 风格选择
  │   ├── 分镜生成
  │   └── 文案优化
  │
  ├── Video Composition Agent
  │   ├── 素材拼接
  │   ├── TTS 配音
  │   ├── 字幕生成
  │   └── BGM 合成
  │
  └── Quality Control Agent
      ├── 内容审核
      ├── 质量评分
      └── A/B 对比
```

### 5.3 数据看板

- 生成趋势：时间线折线图（视频产出量、成功率）
- 品类分布：环形饼图
- 因子归因矩阵：热力图展示各因子与转化率关联
- A/B 对比：左右双列对比视图
- 任务追踪：全链路 Trace 视图（瀑布图展示每步耗时）

### 5.4 工程体验

- **实时推送**: WebSocket/SSE 推送任务状态变更
- **状态管理**: Zustand 替代 prop drilling
- **错误处理**: 全局 ErrorBoundary + React Query 错误重试
- **加载体验**: 骨架屏 + 渐进加载
- **长任务**: 进度持久化 + 断点续传 + 失败原因展示

---

## 六、移动端适配策略

### 6.1 响应式断点

| 断点 | 宽度 | 布局策略 |
|------|------|---------|
| xs | < 576px | 单栏堆叠，简化交互 |
| sm | 576-768px | 单栏，底部导航 |
| md | 768-992px | 双栏，保留核心功能 |
| lg | 992-1200px | 完整三栏，桌面布局 |
| xl | > 1200px | 完整布局，最大化效率 |

### 6.2 移动端适配变化

- **导航**: 侧边栏 → 底部 Tab Bar
- **分镜编辑器**: 三栏 → 上下滑动（配置/预览/时间轴切换）
- **媒体库**: 网格 4 列 → 2 列
- **剧本工作室**: 左右分栏 → 上下分段
- **长按替代右键**: 移动端长按触发上下文菜单
- **手势支持**: 滑动切换分镜、捏合缩放时间轴

### 6.3 自适应策略

- 使用 CSS Grid + Flexbox 响应式布局
- 组件级断点（Component-level breakpoints）而非仅页面级
- 检测设备类型，移动端默认启用亮色模式（户外可见性）
- 关键操作（一键成片、生成剧本）始终悬浮在屏幕底部

---

## 七、实施路线图

### Phase 1 (当前目标): 前端 UI 重构 + 后端联调

**前端：**
1. 设计系统暗色化 — tokens + CSS 变量 + Ant Design 主题覆盖
2. 自定义 Studio 组件层 — GlassPanel/StudioLayout/MediaGrid/PreviewPlayer
3. 4 个页面模块级重构（数据工作室/媒体库/剧本工作室/视频工作室）
4. 暗色/亮色模式切换
5. 页面动效系统

**后端：**
1. Material/Script/Creation 三个新模块基础 API
2. 前端真实 API 联调（替换 Mock）
3. WebSocket 实时进度推送

### Phase 2: 素材智能 + 分镜编辑器

1. 三层标签体系落地 + 多模态 LLM 分析
2. 素材向量化检索 (PGVector)
3. 分镜编辑器完整实现（拖拽/快捷键/详情编辑）
4. 分镜级重生成 + 素材替换
5. TTS / 字幕 / BGM 集成

### Phase 3: Agent 编排 + 数据看板

1. LangGraph 工作流编排
2. 智能剪辑 Agent
3. A/B 对比视图
4. 数据看板 + 因子归因可视化
5. 导出多格式/多分辨率

### Phase 4: 工程体验打磨

1. 长任务断点续传
2. 合规审核流
3. 移动端全面适配
4. 性能优化（懒加载/虚拟滚动/缓存策略）
5. 可观测性（日志/监控/Trace）

---

## 八、技术栈变更

| 层 | 现有 | 新增 |
|----|------|------|
| 前端框架 | React 18 + Vite | 保持不变 |
| UI 库 | Ant Design 5 | + 自定义 Studio 组件体系 |
| 状态管理 | useState prop drilling | + Zustand |
| 实时通信 | — | + WebSocket/SSE (EventSource) |
| 拖拽 | — | + @dnd-kit |
| 路由 | react-router-dom v6 | 保持不变 |
| 图表 | ECharts | 保持不变 |
| 后端 | NestJS | + Material/Script/Creation/Agent 模块 |
| 数据库 | PostgreSQL | + PGVector 扩展 |
| 消息队列 | — | + BullMQ (任务调度) |
| AI编排 | — | + LangGraph |
| 媒体处理 | — | + FFmpeg |

---

## 九、文件结构变更

```
apps/frontend/src/
├── components/         (新增 - 自定义组件)
│   ├── studio/
│   │   ├── GlassPanel.tsx
│   │   ├── StudioLayout.tsx
│   │   └── StudioHeader.tsx
│   ├── timeline/
│   │   ├── Timeline.tsx
│   │   ├── TimelineTrack.tsx
│   │   └── ShotBlock.tsx
│   ├── media/
│   │   ├── MediaGrid.tsx
│   │   └── MediaCard.tsx
│   ├── player/
│   │   └── PreviewPlayer.tsx
│   └── common/
│       ├── ThemeToggle.tsx
│       └── ProgressTracker.tsx
├── hooks/              (新增 - 自定义 Hooks)
│   ├── useTheme.ts
│   ├── useStoryboard.ts
│   └── useWebSocket.ts
├── store/              (新增 - Zustand 状态管理)
│   ├── useAppStore.ts
│   └── useStoryboardStore.ts
├── styles/             (新增 - 样式系统)
│   ├── tokens.css
│   ├── glassmorphism.css
│   └── animations.css
├── pages/              (重构 - 页面模块)
│   ├── dashboard/ → studio/
│   ├── material/   → library/
│   ├── script/     → script-studio/
│   └── creation/   → video-studio/
├── theme/tokens.ts     (保留并扩展)
└── index.css           (保留并扩展)
```

---

## 十、设计原则

1. **沉浸大于信息密度** — 不要堆砌信息，用空间和动效引导注意力
2. **每个操作都有反馈** — 点击/拖拽/生成都有即时的视觉或动效反馈
3. **创作流不打断** — 配置 → 预览 → 编辑 → 生成，全程无缝
4. **暗色为默认，亮色可切换** — 暗色增强沉浸感，亮色保障户外可读性
5. **桌面优先，移动降级** — 先在桌面实现完整体验，再针对移动端做交互降级
6. **渐进增强** — 每个页面先跑通基础功能，再叠加动画和高级交互
