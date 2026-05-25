import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
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

  async getOverview(userId?: string, productSpaceId?: string): Promise<OverviewData> {
    // 数据库表可能尚未建立（首次部署），任何一步失败都不应让 dashboard 整页崩
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
      this.creationRepo.count({ where: { ...baseWhere, createdAt: MoreThanOrEqual(today) } }),
    );

    const completed = await safeCount(() =>
      this.creationRepo.count({ where: { ...baseWhere, status: 'completed' } }),
    );
    const total = totalCreations;
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
