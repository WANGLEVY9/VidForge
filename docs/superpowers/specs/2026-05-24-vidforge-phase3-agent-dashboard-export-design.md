# Phase 3: Agent 编排 + 数据看板 + A/B 对比 + 导出系统设计文档

## 概述

- **项目**: 电商场景 AIGC 带货视频生成系统
- **设计方向**: Agent 协作工作流 + 生产级数据观测 + 视频对比评测 + 全格式导出管线
- **实施策略**: 四部分增量推进，每个子系统可独立交付
- **前置条件**: Phase 1 (UI重构) + Phase 2 (分镜编辑器/素材智能) 已完成

---

## 一、Agent 编排模块 (LangGraph.js)

### 1.1 架构设计

```
NestJS AgentModule
│
├── AgentController      (POST /agent/run — 启动工作流)
├── AgentService         (工作流调度入口)
│
├── OrchestratorService  (LangGraph StateGraph 定义 + 执行)
│   │
│   ├── MaterialAnalysisAgent    (素材分析)
│   ├── ScriptGenerationAgent    (剧本生成)
│   ├── VideoCompositionAgent    (视频合成)
│   └── QualityControlAgent      (质量审核)
│
└── AgentState            (Graph 共享状态)
```

### 1.2 Agent 工作流拓扑

```
Orchestrator Agent (入口)
  │
  │  解析请求 → 规划子任务 → 初始化 AgentState
  │
  ├── Material Analysis Agent
  │   ├── 智能素材匹配 (根据商品信息搜索素材库)
  │   └── 标签补充 (LLM 分析后补全三层标签)
  │
  ├── Script Generation Agent
  │   ├── 风格选择 (匹配用户偏好或自动推荐)
  │   ├── 分镜生成 (LLM 生成 Shot list)
  │   └── 文案优化 (TTS 台词润色)
  │
  ├── Video Composition Agent
  │   ├── 素材拼接 (按 storyboard 顺序合成)
  │   ├── TTS 配音 (文本转语音 + 时间轴对齐)
  │   ├── 字幕生成 (ASR/硬字幕)
  │   └── BGM 合成 (背景音乐匹配 + 混音)
  │
  └── Quality Control Agent
      ├── 内容审核 (合规检查 + 敏感内容过滤)
      ├── 质量评分 (CLIP 评分 + 画质检测)
      └── A/B 数据输出 (为对比模块提供数据)
```

### 1.3 AgentState 定义

```typescript
interface AgentState {
  // 任务信息
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentNode: string;
  progress: number;

  // 输入
  productName: string;
  category: string;
  sellingPoints: string;
  targetAudience?: string;
  style?: string;

  // 各 Agent 输出
  materialAnalysis?: {
    matchedMaterials: MaterialItem[];
    tags: Record<string, any>;
    analysis: string;
  };

  scriptGeneration?: {
    shots: Shot[];
    voiceover: string;
    style: string;
  };

  videoComposition?: {
    videoUrl: string;
    duration: number;
    ttsUrl: string;
    subtitleUrl: string;
    bgmUrl: string;
  };

  qualityControl?: {
    contentScore: number;
    qualityScore: number;
    passed: boolean;
    issues: string[];
  };

  // 错误/重试
  errors: Array<{ node: string; message: string; timestamp: Date }>;
  retryCount: number;
}
```

### 1.4 LangGraph StateGraph 定义

```typescript
// 使用 @langchain/langgraph 构建有向图
const workflow = new StateGraph<AgentState>({
  channels: {
    taskId: { value: (a, b) => b ?? a, default: () => '' },
    status: { value: (a, b) => b ?? a, default: () => 'pending' },
    currentNode: { value: (a, b) => b ?? a, default: () => '' },
    progress: { value: (a, b) => b ?? a, default: () => 0 },
    // ... 其他 channels
  },
});

workflow.addNode('orchestrator', orchestratorNode);
workflow.addNode('material_analysis', materialAnalysisNode);
workflow.addNode('script_generation', scriptGenerationNode);
workflow.addNode('video_composition', videoCompositionNode);
workflow.addNode('quality_control', qualityControlNode);

workflow.addEdge('orchestrator', 'material_analysis');
workflow.addEdge('material_analysis', 'script_generation');
workflow.addEdge('script_generation', 'video_composition');
workflow.addEdge('video_composition', 'quality_control');

// 条件边: quality check 通过则结束，否则回退
workflow.addConditionalEdges('quality_control', (state) => {
  if (state.qualityControl?.passed) return 'end';
  if (state.retryCount < 3) return 'video_composition'; // 重试
  return 'end';
});
```

### 1.5 模块文件结构

```
apps/backend/src/modules/agent/
├── agent.module.ts
├── agent.controller.ts
├── agent.service.ts
├── orchestrator.service.ts
├── dto/
│   └── run-agent.dto.ts
├── interfaces/
│   ├── agent-state.interface.ts
│   └── agent-result.interface.ts
└── agents/
    ├── material-agent.service.ts
    ├── script-agent.service.ts
    ├── composition-agent.service.ts
    └── quality-agent.service.ts
```

### 1.6 API 端点

| Method | Path | Description |
|--------|------|-------------|
| POST | /agent/run | 启动完整 Agent 工作流 |
| GET | /agent/status/:taskId | 查询工作流状态 |
| POST | /agent/cancel/:taskId | 取消进行中的工作流 |

---

## 二、数据看板增强

### 2.1 布局结构

```
┌────────────────────────────────────────────────────────────┐
│  数据工作室              [日][周][月][自定义]  2026-05-01→05-24│
│  <最近更新: 2 分钟前>                                   <导出>│
├──────┬──────┬──────┬──────┬──────┬────────────────────────┤
│ 素材  │ 剧本  │ 视频  │ 今日  │ 成功  │ 平均耗时             │
│ 总量  │ 总数  │ 产出  │ 新增  │ 率    │                     │
├──────┴──────┴──────┴──────┴──────┴────────────────────────┤
│  创作趋势 (双轴折线图: 产出量 + 成功率)                       │
│  同比/环比/预测                                             │
├──────────────────────────┬────────────────────────────────┤
│  Agent 任务分布 (玫瑰图)   │  模型性能对比 (雷达图)           │
├──────────────────────────┴────────────────────────────────┤
│  品类×模型×成功率 (堆叠柱状图)                               │
├──────────────────────────┬────────────────────────────────┤
│  队列实时状态              │  因子归因矩阵 (热力图)           │
├──────────────────────────┴────────────────────────────────┤
│  任务追踪瀑布图 (Trace View)                                │
└──────────────────────────────────────────────────────────┘
```

### 2.2 数据指标

| 类别 | 指标 | 计算方式 | 更新频率 |
|------|------|---------|---------|
| 总量 | 素材数/剧本数/视频数 | COUNT | 实时 |
| 趋势 | 日产出量/成功率/耗时 | GROUP BY date | 日聚合 |
| Agent | 各节点耗时/成功率 | 从 AgentState 聚合 | 任务完成时 |
| 模型 | 各模型质量/速度/成本评分 | Quality Agent 输出 | 任务完成时 |
| 队列 | 深度/吞吐量/等待时间 | BullMQ 指标 | 实时 |
| 归因 | 各因子与成功率相关性 | 统计相关系数 | 定时计算 |
| Trace | 单任务各节点耗时 | AgentState 时间戳 | 任务完成时 |

### 2.3 后端 Analytics 模块

```
apps/backend/src/modules/analytics/
├── analytics.module.ts
├── analytics.controller.ts
├── analytics.service.ts
└── interfaces/
    └── analytics.interface.ts
```

**API 端点:**

| Method | Path | Description |
|--------|------|-------------|
| GET | /analytics/overview | 概览指标卡片数据 |
| GET | /analytics/trends?period=week | 创作趋势数据 |
| GET | /analytics/distribution | 品类/模型分布 |
| GET | /analytics/queue | 队列实时状态 |
| GET | /analytics/attribution | 因子归因矩阵 |
| GET | /analytics/traces | 任务追踪瀑布图 |

---

## 三、A/B 对比视图

### 3.1 页面结构

```
┌────────────────────────────────────────────────────────┐
│  A/B 对比评测                                [+ 新建对比] │
├─────────────────┬────────────────────────────────────┤
│  版本 A          │  版本 B                             │
│  ┌────────────┐ │  ┌────────────┐                    │
│  │  视频播放器  │ │  │  视频播放器  │                    │
│  │  ▶ 进度条   │ │  │  ▶ 进度条   │                    │
│  └────────────┘ │  └────────────┘                    │
│  模型/参数信息   │  模型/参数信息                       │
├─────────────────┴────────────────────────────────────┤
│  同步播放控制  [同步] [独立]                           │
├──────────────────────────────────────────────────────┤
│  对比指标表 (画质/速度/完整性/匹配度/自然度)            │
│  综合推荐                                             │
├──────────────────────────────────────────────────────┤
│  [应用版本A] [应用版本B] [另存为模板]                  │
└──────────────────────────────────────────────────────┘
```

### 3.2 组件结构

```
apps/frontend/src/pages/ab-compare/
├── index.tsx                    # A/B 对比页面
├── ab-compare.css               # 样式
└── components/
    ├── ComparePlayer.tsx         # 双屏播放器（同步/独立模式）
    └── CompareMetrics.tsx        # 指标对比表格
```

### 3.3 交互能力

| 操作 | 行为 |
|------|------|
| 同步播放 | 两个播放器时间轴联动，暂停/播放/拖拽同步 |
| 独立控制 | 各自独立播放，用于分别审查 |
| 重新生成 | 单独重新生成某个版本 |
| 替换素材 | 替换某个版本的参考素材后重新生成 |
| 保存模板 | 将当前比对配置保存为预设模板 |
| 导出报告 | 导出对比结果 (PDF/CSV) |

---

## 四、多格式导出系统

### 4.1 架构

```
NestJS ExportModule
│
├── ExportController     (POST /export — 创建导出任务)
│
├── ExportService        (BullMQ Worker — 执行导出)
│   ├── FFmpeg Process    (视频编码)
│   ├── Subtitle Burn-in  (字幕嵌入)
│   └── Thumbnail Gen     (缩略图生成)
│
└── ExportTask Entity    (任务状态持久化)
```

### 4.2 支持的格式/分辨率

| 格式 | 编码 | 适用场景 |
|------|------|---------|
| MP4 | H.264 | 通用发布 (默认) |
| MP4 | H.265/HEVC | 高压缩率 (4K 推荐) |
| MOV | ProRes | 后续编辑 |
| WebM | VP9 | Web 播放 |
| GIF | — | 社交媒体预览 |

| 分辨率 | 宽高比 | 备注 |
|--------|--------|------|
| 2160p (4K) | 9:16 / 16:9 | 高质量输出 |
| 1080p | 9:16 / 16:9 | 默认推荐 |
| 720p | 9:16 / 16:9 | 快速生成 |
| 480p | 9:16 / 16:9 | 预览/缩略图 |

### 4.3 文件结构

```
apps/backend/src/modules/export/
├── export.module.ts
├── export.controller.ts
├── export.service.ts
├── entities/
│   └── export-task.entity.ts
└── dto/
    └── create-export.dto.ts
```

### 4.4 API 端点

| Method | Path | Description |
|--------|------|-------------|
| POST | /export | 创建导出任务 |
| GET | /export/list | 导出历史列表 |
| GET | /export/:id | 导出任务详情/下载 |
| DELETE | /export/:id | 取消导出任务 |

### 4.5 Frontend 组件

```
apps/frontend/src/pages/creation/components/
└── ExportPanel.tsx        # 导出设置对话框 (嵌入创作页)
```

---

## 五、文件结构总览

```
## 新建
apps/backend/src/modules/agent/
├── agent.module.ts
├── agent.controller.ts
├── agent.service.ts
├── orchestrator.service.ts
├── dto/run-agent.dto.ts
├── interfaces/
│   ├── agent-state.interface.ts
│   └── agent-result.interface.ts
└── agents/
    ├── material-agent.service.ts
    ├── script-agent.service.ts
    ├── composition-agent.service.ts
    └── quality-agent.service.ts

apps/backend/src/modules/analytics/
├── analytics.module.ts
├── analytics.controller.ts
├── analytics.service.ts
└── interfaces/analytics.interface.ts

apps/backend/src/modules/export/
├── export.module.ts
├── export.controller.ts
├── export.service.ts
├── entities/export-task.entity.ts
└── dto/create-export.dto.ts

apps/frontend/src/pages/ab-compare/
├── index.tsx
├── ab-compare.css
└── components/
    ├── ComparePlayer.tsx
    └── CompareMetrics.tsx

apps/frontend/src/pages/creation/components/
└── ExportPanel.tsx

## 修改
apps/backend/src/app.module.ts          # 注册 AgentModule, AnalyticsModule, ExportModule
apps/frontend/src/pages/dashboard/index.tsx  # 增强数据看板
apps/frontend/src/App.tsx               # 添加 A/B 对比路由
apps/backend/package.json               # 添加 @langchain/langgraph langchain
```

---

## 六、新增依赖

| 包 | 模块 | 用途 |
|----|------|------|
| `@langchain/langgraph` | backend | Agent 工作流编排 |
| `@langchain/core` | backend | LangChain 基础类型 |
| `langchain` | backend | LLM 调用封装 |
| `fluent-ffmpeg` | backend | 已有，用于导出 |
| `@ffmpeg-installer/ffmpeg` | backend | FFmpeg 二进制 (开发环境) |

---

## 七、实施顺序

```
Phase 3.1: Agent 编排模块 (核心智能)
  ├── Task 1: 安装 LangGraph.js 依赖 + AgentState + DTO
  ├── Task 2: Orchestrator Service (StateGraph 定义)
  ├── Task 3: 四个 Agent 实现 (Material/Script/Composition/Quality)
  ├── Task 4: Agent Controller + Module 注册
  └── Task 5: 前端 Agent 状态面板

Phase 3.2: 数据看板增强
  ├── Task 6: Analytics 后端模块 (趋势/分布/队列/归因/Trace API)
  ├── Task 7: Dashboard 增强 (新图表 + 时间选择器 + 交互)
  └── Task 8: 队列实时状态组件

Phase 3.3: A/B 对比视图
  ├── Task 9: ComparePlayer + CompareMetrics 组件
  └── Task 10: A/B 对比页面 + 路由

Phase 3.4: 导出系统
  ├── Task 11: Export 后端模块 (BullMQ + FFmpeg)
  └── Task 12: ExportPanel 前端组件
```

---

## 八、设计原则

1. **Agent 可观测性** — 每个 Agent 节点执行状态、输入输出可追溯，答辩时可展示 Graph 流程图
2. **看板真实性** — 所有图表数据来自真实 API，无静态 mock，让评委看到实时数据驱动
3. **对比可量化** — A/B 对比不只有主观视觉，包含 CLIP 评分、速度、完整性等量化指标
4. **导出可用性** — 导出不是后加功能，而是创作流程的一等公民，嵌入在创作页中
5. **全栈 TypeScript** — 从浏览器到 Agent 编排，统一语言降低架构复杂度
