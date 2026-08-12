import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AgentState, MaterialItem } from '../interfaces/agent-state.interface';
import { Material } from '../../material/entities/material.entity';

/**
 * 素材分析 Agent
 *
 * 真实工作:
 * 1. 在用户的素材库中按 productSpaceId / category / 关键词检索相关素材
 * 2. 优先选择已有视觉理解结果(productTags.category 匹配)的素材
 * 3. 提取素材的 caption / 标签,供后续 Script Agent 把分镜与素材关联
 * 4. 当素材库空时,标记 hasRealMaterials=false,后续走纯 text-to-video 路径
 */
@Injectable()
export class MaterialAgentService {
  private readonly logger = new Logger(MaterialAgentService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>
  ) {}

  async analyze(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(
      `[${state.taskId}] MaterialAgent 分析: ${state.productName} (${state.category})`
    );
    const startedAt = new Date();
    const trace = state.trace ?? [];

    let matched: MaterialItem[] = [];
    try {
      const where: any = { type: 'image' };
      if (state.userId) where.userId = state.userId;
      if (state.productSpaceId) where.productSpaceId = state.productSpaceId;

      // 第一轮:按 productSpaceId 限定 + name 关键词
      const keywords = this.extractKeywords(state);
      const baseList = await this.materialRepo.find({
        where: {
          ...where,
          ...(keywords.length > 0 ? { name: Like(`%${keywords[0]}%`) } : {}),
        },
        order: { createdAt: 'DESC' },
        take: 20,
      });

      // 第二轮(若空):放宽到该 space 下所有图片素材
      const list =
        baseList.length > 0
          ? baseList
          : state.productSpaceId
            ? await this.materialRepo.find({ where, order: { createdAt: 'DESC' }, take: 20 })
            : baseList;

      // 计算"相关度":category 匹配 +0.5,关键词命中 +0.3,有视觉标签 +0.2
      matched = list
        .map((m) => {
          let score = 0.1;
          const pt: any = m.productTags ?? {};
          if (pt.category && pt.category === state.category) score += 0.5;
          const caption: string = (m.metadata as any)?.caption ?? pt?.summary ?? m.name ?? '';
          for (const kw of keywords) {
            if (caption.includes(kw) || (m.name ?? '').includes(kw)) score += 0.3;
          }
          if (m.productTags || m.videoTags || m.clipTags) score += 0.2;

          return {
            id: m.id,
            name: m.name,
            type: m.type,
            url: m.url,
            thumbnailUrl: m.thumbnailUrl,
            tags: m.tags || [],
            relevance: Math.min(1, score),
            caption,
          } as MaterialItem;
        })
        .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
        .slice(0, 5);
    } catch (err: any) {
      this.logger.warn(`MaterialAgent 检索失败: ${err?.message ?? err}`);
    }

    const tags = {
      category: state.category,
      style: state.style ?? '专业',
      keywords: this.extractKeywords(state),
    };

    const summary =
      matched.length > 0
        ? `检索到 ${matched.length} 个相关素材,Top-1 相关度 ${matched[0].relevance?.toFixed(2)}`
        : '素材库无可用素材,后续走纯文生视频路径';

    const endedAt = new Date();
    trace.push({
      span: 'material_analysis',
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      latencyMs: endedAt.getTime() - startedAt.getTime(),
      status: 'ok',
      summary,
    });

    return {
      materialAnalysis: {
        matchedMaterials: matched,
        tags,
        analysis: summary,
        hasRealMaterials: matched.length > 0,
      },
      trace,
    };
  }

  private extractKeywords(state: AgentState): string[] {
    const raw = `${state.productName} ${state.sellingPoints ?? ''}`;
    return raw
      .split(/[,，\s、;；]+/)
      .map((s) => s.trim())
      .filter((s) => s && s.length >= 2)
      .slice(0, 5);
  }
}
