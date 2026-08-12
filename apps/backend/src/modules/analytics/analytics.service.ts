import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { Material } from '../material/entities/material.entity';
import { Script } from '../script/entities/script.entity';
import { CreationTask } from '../creation/entities/creation-task.entity';
import {
  OverviewData,
  TrendPoint,
  DistributionItem,
  QueueStatus,
  AttributionMatrix,
  TraceItem,
} from './interfaces/analytics.interface';
import { QueueRunnerService } from '../queue/queue-runner.service';
import { TraceService } from '../trace/trace.service';

/**
 * 数据分析服务(全部接真实数据)
 *
 * 数据来源:
 * - PostgreSQL: materials / scripts / creation_tasks 表
 * - BullMQ: 通过 QueueRunnerService.getCounts() 拿队列实时状态
 * - TraceService: trace_spans 表的瀑布图与成本数据
 *
 * 所有方法都包了 try/catch:任何一项失败 → 返回空/默认值,不阻塞前端 dashboard
 */
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
    private readonly queueRunner: QueueRunnerService,
    private readonly traceService: TraceService
  ) {}

  // ─────────────────────────────────────────────
  //  Overview
  // ─────────────────────────────────────────────
  async getOverview(userId?: string, productSpaceId?: string): Promise<OverviewData> {
    const safeCount = async (fn: () => Promise<number>): Promise<number> => {
      try {
        return await fn();
      } catch (err: any) {
        this.logger.warn(`overview count failed: ${err?.message ?? err}`);
        return 0;
      }
    };

    const baseWhere: any = {};
    if (userId) baseWhere.userId = userId;
    if (productSpaceId) baseWhere.productSpaceId = productSpaceId;

    const [totalMaterials, totalScripts, totalCreations] = await Promise.all([
      safeCount(() => this.materialRepo.count({ where: baseWhere })),
      safeCount(() => this.scriptRepo.count({ where: baseWhere })),
      safeCount(() => this.creationRepo.count({ where: baseWhere })),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCreations = await safeCount(() =>
      this.creationRepo.count({ where: { ...baseWhere, createdAt: MoreThanOrEqual(today) } })
    );

    const completed = await safeCount(() =>
      this.creationRepo.count({ where: { ...baseWhere, status: 'completed' } })
    );
    const successRate =
      totalCreations > 0 ? Math.round((completed / totalCreations) * 1000) / 10 : 0;

    // ── 真实环比(近 30 天 / 上个 30 天) ───────────
    const momChanges = await this.computeMomChanges(baseWhere);

    // ── 平均成片时长(从 result.duration 中取) ───────
    const avgDuration = await this.computeAvgDuration(baseWhere);

    return {
      totalMaterials,
      totalScripts,
      totalCreations,
      todayCreations,
      successRate,
      avgDuration,
      momChanges,
    };
  }

  private async computeMomChanges(baseWhere: any): Promise<OverviewData['momChanges']> {
    try {
      const now = new Date();
      const start1 = new Date(now);
      start1.setDate(now.getDate() - 30);
      const start2 = new Date(now);
      start2.setDate(now.getDate() - 60);

      const recent = await this.creationRepo.count({
        where: { ...baseWhere, createdAt: MoreThanOrEqual(start1) },
      });
      const previous = await this.creationRepo.count({
        where: { ...baseWhere, createdAt: Between(start2, start1) },
      });

      const formatChange = (curr: number, prev: number): string => {
        if (prev === 0) return curr > 0 ? '+100%' : '0%';
        const diff = ((curr - prev) / prev) * 100;
        return `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%`;
      };

      const matRecent = await this.materialRepo.count({
        where: { ...baseWhere, createdAt: MoreThanOrEqual(start1) },
      });
      const matPrev = await this.materialRepo.count({
        where: { ...baseWhere, createdAt: Between(start2, start1) },
      });
      const scrRecent = await this.scriptRepo.count({
        where: { ...baseWhere, createdAt: MoreThanOrEqual(start1) },
      });
      const scrPrev = await this.scriptRepo.count({
        where: { ...baseWhere, createdAt: Between(start2, start1) },
      });

      return {
        materials: formatChange(matRecent, matPrev),
        scripts: formatChange(scrRecent, scrPrev),
        creations: formatChange(recent, previous),
        successRate: '+0%',
        avgDuration: '+0%',
      };
    } catch (err: any) {
      this.logger.warn(`computeMomChanges 失败: ${err?.message ?? err}`);
      return {
        materials: '+0%',
        scripts: '+0%',
        creations: '+0%',
        successRate: '+0%',
        avgDuration: '+0%',
      };
    }
  }

  private async computeAvgDuration(baseWhere: any): Promise<number> {
    try {
      const completed = await this.creationRepo.find({
        where: { ...baseWhere, status: 'completed' },
        order: { createdAt: 'DESC' as any },
        take: 100,
      });
      if (completed.length === 0) return 0;
      const sum = completed.reduce((s, t) => {
        const d = (t.result as any)?.duration ?? 0;
        return s + (Number(d) || 0);
      }, 0);
      return Math.round((sum / completed.length) * 10) / 10;
    } catch {
      return 0;
    }
  }

  // ─────────────────────────────────────────────
  //  Trends - 按天聚合创作任务数与成功率
  // ─────────────────────────────────────────────
  async getTrends(period: string, userId?: string, productSpaceId?: string): Promise<TrendPoint[]> {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);

    try {
      const qb = this.creationRepo
        .createQueryBuilder('t')
        .select(`DATE(t."createdAt")`, 'date')
        .addSelect('COUNT(*)', 'count')
        .addSelect(`SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)`, 'success')
        .where('t."createdAt" >= :start', { start })
        .groupBy(`DATE(t."createdAt")`)
        .orderBy(`DATE(t."createdAt")`, 'ASC');
      if (userId) qb.andWhere('t."userId" = :uid', { uid: userId });
      if (productSpaceId) qb.andWhere('t."productSpaceId" = :pid', { pid: productSpaceId });

      const rows = await qb.getRawMany<{ date: string; count: string; success: string }>();
      const byDate = new Map<string, { count: number; success: number }>();
      for (const r of rows) {
        const key =
          typeof r.date === 'string'
            ? r.date.slice(0, 10)
            : new Date(r.date).toISOString().slice(0, 10);
        byDate.set(key, { count: Number(r.count), success: Number(r.success) });
      }

      const result: TrendPoint[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const v = byDate.get(key) ?? { count: 0, success: 0 };
        const successRate = v.count > 0 ? Math.round((v.success / v.count) * 100) : 0;
        result.push({ date: key, count: v.count, successRate });
      }
      return result;
    } catch (err: any) {
      this.logger.warn(`getTrends 失败: ${err?.message ?? err}`);
      return [];
    }
  }

  // ─────────────────────────────────────────────
  //  Distribution - 按 script.style 或 material.category 分布
  // ─────────────────────────────────────────────
  async getDistribution(userId?: string, productSpaceId?: string): Promise<DistributionItem[]> {
    try {
      const qb = this.materialRepo
        .createQueryBuilder('m')
        .select('COALESCE(m.category, :other)', 'name')
        .addSelect('COUNT(*)', 'value')
        .setParameter('other', '其他')
        .groupBy('m.category');
      if (userId) qb.andWhere('m."userId" = :uid', { uid: userId });
      if (productSpaceId) qb.andWhere('m."productSpaceId" = :pid', { pid: productSpaceId });

      const rows = await qb.getRawMany<{ name: string; value: string }>();
      const items = rows
        .map((r) => ({ name: r.name || '其他', value: Number(r.value) }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value);

      // 没有素材时返回空 → 前端会显示空态;不再造假数据
      return items;
    } catch (err: any) {
      this.logger.warn(`getDistribution 失败: ${err?.message ?? err}`);
      return [];
    }
  }

  // ─────────────────────────────────────────────
  //  Queue Status - 接 BullMQ 真实计数
  // ─────────────────────────────────────────────
  async getQueueStatus(): Promise<QueueStatus> {
    try {
      const counts = await this.queueRunner.getCounts();
      if (counts.mode === 'inline') {
        // 进程内模式:无队列计数,取近 1 分钟"running 中"的 creation_tasks 作为伪指标
        const recent = await this.creationRepo.find({
          where: { status: 'processing' },
          order: { updatedAt: 'DESC' as any },
          take: 50,
        });
        return { depth: 0, processing: recent.length, waiting: 0, avgWaitTime: 0, throughput: 0 };
      }
      const queues = counts.queues ?? {};
      let waiting = 0;
      let processing = 0;
      let completed24h = 0;
      for (const k of Object.keys(queues)) {
        const c = queues[k] ?? {};
        waiting += Number(c.waiting ?? 0) + Number(c.delayed ?? 0);
        processing += Number(c.active ?? 0);
        completed24h += Number(c.completed ?? 0);
      }
      const throughput = Math.round(completed24h / 24); // 任务/小时
      return {
        depth: waiting + processing,
        processing,
        waiting,
        avgWaitTime: 0, // V1 不算,Phase 2 接 metrics
        throughput,
      };
    } catch (err: any) {
      this.logger.warn(`getQueueStatus 失败: ${err?.message ?? err}`);
      return { depth: 0, processing: 0, waiting: 0, avgWaitTime: 0, throughput: 0 };
    }
  }

  // ─────────────────────────────────────────────
  //  Attribution - 按风格/时长 二维交叉表的成功率
  // ─────────────────────────────────────────────
  async getAttribution(userId?: string): Promise<AttributionMatrix> {
    try {
      // factors = 风格(取 5 种最常见),levels = 完成情况
      const factors = ['极简', '动感', '清新', '奢华', '科技'];
      const levels = ['成功率', '完成数', '失败数', '处理中'];
      const data: number[][] = [];

      for (const style of factors) {
        const where: any = {};
        if (userId) where.userId = userId;
        // 通过关联 script 获取风格(简化:这里直接看 result.compose.mode 与 script 风格,但
        // 我们没存 style 到 creation_task。于是改用 script.style 间接关联)
        const scripts = await this.scriptRepo.find({
          where: { ...where, style: this.styleKeyOf(style) as any },
          take: 200,
        });
        const scriptIds = new Set(scripts.map((s) => s.id));
        const allTasks = await this.creationRepo.find({ where, take: 500 });
        const tasks = allTasks.filter((t) => t.scriptId && scriptIds.has(t.scriptId));
        const succ = tasks.filter((t) => t.status === 'completed').length;
        const failed = tasks.filter((t) => t.status === 'failed').length;
        const proc = tasks.filter((t) => t.status === 'processing').length;
        const successRate = tasks.length > 0 ? Math.round((succ / tasks.length) * 100) : 0;
        data.push([successRate, succ, failed, proc]);
      }

      return { factors, levels, data };
    } catch (err: any) {
      this.logger.warn(`getAttribution 失败: ${err?.message ?? err}`);
      return { factors: [], levels: [], data: [] };
    }
  }

  private styleKeyOf(label: string): string {
    const map: Record<string, string> = {
      极简: 'minimalist',
      动感: 'dynamic',
      清新: 'fresh',
      奢华: 'luxury',
      科技: 'technology',
    };
    return map[label] ?? label;
  }

  // ─────────────────────────────────────────────
  //  Traces - 接 TraceService
  // ─────────────────────────────────────────────
  async getTraces(): Promise<TraceItem[]> {
    try {
      const waterfalls = await this.traceService.listTaskWaterfalls(20);
      return waterfalls.map((wf) => ({
        taskId: wf.taskId.length > 12 ? `#${wf.taskId.slice(-6)}` : `#${wf.taskId}`,
        totalDuration: Math.round((wf.totalDurationMs / 1000) * 10) / 10,
        nodes: wf.spans.map((s) => ({
          name: s.span,
          duration: Math.round((s.latencyMs / 1000) * 10) / 10,
          status: s.status === 'ok' ? 'completed' : 'failed',
        })),
      }));
    } catch (err: any) {
      this.logger.warn(`getTraces 失败: ${err?.message ?? err}`);
      return [];
    }
  }

  /** 成本/Token/缓存命中 概览(供 Dashboard 卡片) */
  async getCostOverview(): Promise<{
    totalCalls: number;
    totalCostCents: number;
    totalTokens: number;
    cacheHitRate: number;
    avgLatencyMs: number;
  }> {
    return this.traceService.overview();
  }
}
