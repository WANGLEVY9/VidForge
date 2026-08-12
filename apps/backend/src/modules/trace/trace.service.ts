import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TraceSpan } from './trace.entity';

export interface RecordSpanInput {
  userId?: string;
  taskId: string;
  scope: 'creation' | 'agent' | 'export' | 'material' | 'script';
  span: string;
  startedAt: Date;
  endedAt?: Date;
  status?: 'ok' | 'error';
  summary?: string;
  errorMessage?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  costCents?: number;
  cacheHit?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Trace 服务
 *
 * 业务侧只需在关键节点 startSpan() 和 endSpan(),
 * 服务自动落库并把成本估算填上。
 *
 * 设计要点:
 * - 任何写入失败都不能让业务流程崩溃 — try/catch 吞掉,只打 warn
 * - 定时清理:超过 30 天的数据清掉(后续 Phase 可换成分区表)
 */
@Injectable()
export class TraceService {
  private readonly logger = new Logger(TraceService.name);

  /** 火山方舟 Doubao-Seed-2.0-pro 的估算价格(每 1k tokens) */
  private readonly TEXT_INPUT_PRICE_PER_1K = 0.0008; // 美元
  private readonly TEXT_OUTPUT_PRICE_PER_1K = 0.0024;
  /** 火山方舟 Doubao-Seedance-1.5-pro:按视频时长计费,这里粗估每 5s 视频 0.18 美元 */
  private readonly VIDEO_PRICE_PER_5S = 0.18;

  constructor(
    @InjectRepository(TraceSpan)
    private readonly repo: Repository<TraceSpan>
  ) {}

  /** 写入一条完整的 span(开始时间已知,直接终结) */
  async recordSpan(input: RecordSpanInput): Promise<void> {
    try {
      const endedAt = input.endedAt ?? new Date();
      const latencyMs = endedAt.getTime() - input.startedAt.getTime();

      const costCents =
        input.costCents ??
        this.estimateCost({
          model: input.model,
          promptTokens: input.promptTokens,
          completionTokens: input.completionTokens,
          metadata: input.metadata,
        });

      await this.repo.save(
        this.repo.create({
          userId: input.userId,
          taskId: input.taskId,
          scope: input.scope,
          span: input.span,
          startedAt: input.startedAt,
          endedAt,
          latencyMs,
          status: input.status ?? 'ok',
          summary: input.summary,
          errorMessage: input.errorMessage,
          model: input.model,
          promptTokens: input.promptTokens ?? 0,
          completionTokens: input.completionTokens ?? 0,
          costCents,
          cacheHit: input.cacheHit ?? false,
          metadata: input.metadata,
        })
      );
    } catch (err: any) {
      this.logger.warn(`Trace 写入失败: ${err?.message ?? err}`);
    }
  }

  /** 估算单次调用成本,返回单位:美分 */
  estimateCost(opts: {
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    metadata?: Record<string, any>;
  }): number {
    if (!opts.model) return 0;
    const model = opts.model.toLowerCase();

    // 文本/视觉模型
    if (model.includes('seed') && !model.includes('seedance')) {
      const pIn = (opts.promptTokens ?? 0) / 1000;
      const pOut = (opts.completionTokens ?? 0) / 1000;
      const dollars = pIn * this.TEXT_INPUT_PRICE_PER_1K + pOut * this.TEXT_OUTPUT_PRICE_PER_1K;
      return Math.round(dollars * 100 * 100) / 100; // 保留 2 位小数的美分
    }

    // 视频模型
    if (model.includes('seedance') || model.includes('video')) {
      const seconds = Number(opts.metadata?.durationSec ?? 5);
      const dollars = (seconds / 5) * this.VIDEO_PRICE_PER_5S;
      return Math.round(dollars * 100 * 100) / 100;
    }

    return 0;
  }

  // ───────────── 查询 ─────────────

  async findByTask(taskId: string): Promise<TraceSpan[]> {
    return this.repo.find({ where: { taskId }, order: { startedAt: 'ASC' } });
  }

  async listRecent(limit = 30): Promise<TraceSpan[]> {
    return this.repo.find({ order: { createdAt: 'DESC' as any }, take: limit });
  }

  /** 聚合"按 task 分组的瀑布图"前 N 条 */
  async listTaskWaterfalls(limit = 20): Promise<
    Array<{
      taskId: string;
      scope: string;
      totalDurationMs: number;
      totalCostCents: number;
      spans: TraceSpan[];
    }>
  > {
    // 取最近活动的 task IDs
    const recent = await this.repo
      .createQueryBuilder('s')
      .select('s.taskId', 'taskId')
      .addSelect('MAX(s.endedAt)', 'lastAt')
      .groupBy('s.taskId')
      .orderBy('"lastAt"', 'DESC')
      .limit(limit)
      .getRawMany<{ taskId: string }>();

    const result = [];
    for (const row of recent) {
      const spans = await this.findByTask(row.taskId);
      if (!spans.length) continue;
      const totalDurationMs = spans.reduce((s, x) => s + (x.latencyMs ?? 0), 0);
      const totalCostCents = spans.reduce((s, x) => s + (x.costCents ?? 0), 0);
      result.push({
        taskId: row.taskId,
        scope: spans[0].scope,
        totalDurationMs,
        totalCostCents,
        spans,
      });
    }
    return result;
  }

  /** Token / 成本 / cache hit 概览 */
  async overview(): Promise<{
    totalCalls: number;
    totalCostCents: number;
    totalTokens: number;
    cacheHitRate: number;
    avgLatencyMs: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayList = await this.repo
        .createQueryBuilder('s')
        .where('s.createdAt >= :today', { today })
        .getMany();
      const totalCalls = todayList.length;
      const totalCostCents = todayList.reduce((s, x) => s + (x.costCents ?? 0), 0);
      const totalTokens = todayList.reduce(
        (s, x) => s + (x.promptTokens ?? 0) + (x.completionTokens ?? 0),
        0
      );
      const cacheHits = todayList.filter((x) => x.cacheHit).length;
      const cacheHitRate = totalCalls > 0 ? Math.round((cacheHits / totalCalls) * 1000) / 10 : 0;
      const avgLatencyMs =
        totalCalls > 0
          ? Math.round(todayList.reduce((s, x) => s + (x.latencyMs ?? 0), 0) / totalCalls)
          : 0;
      return { totalCalls, totalCostCents, totalTokens, cacheHitRate, avgLatencyMs };
    } catch (err: any) {
      this.logger.warn(`trace overview 失败: ${err?.message ?? err}`);
      return { totalCalls: 0, totalCostCents: 0, totalTokens: 0, cacheHitRate: 0, avgLatencyMs: 0 };
    }
  }
}
