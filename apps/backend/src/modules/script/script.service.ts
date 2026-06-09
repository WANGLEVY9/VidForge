import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Script } from './entities/script.entity';
import { CreateScriptDto } from './dto/create-script.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { ArkTextService } from '../ai/services/ark-text.service';
import { ArkConfigService } from '../ai/services/ark-config.service';
import { searchHitScripts, HitScriptSeed } from '../rag/hit-scripts.seed';
import { ProductSpace } from '../product-space/entities/product-space.entity';
import { ComplianceService, ComplianceReport } from '../compliance/compliance.service';

interface ShotDraft {
  index: number;
  duration: number;
  description: string;
  voiceover: string;
  caption: string;
  cameraMovement?: string;
  type?: string;
}

export interface ScriptResult {
  title: string;
  duration: number;
  totalDuration: string;
  shots: ShotDraft[];
  voiceover: string;
  bgmSuggestion: string;
  tags: string[];
  /** 模型来源标识：'ark' / 'fallback' */
  source: 'ark' | 'fallback';
  /** 当 source=fallback 时, 说明原因, 便于排查 */
  fallbackReason?: string;
  /** 本次生成参考的爆款脚本 ID 列表(RAG) */
  ragReferences?: Array<{ id: string; hookType: string; performance: string }>;
  /** 合规审核结果 */
  compliance?: ComplianceReport;
}

const STYLE_LABEL: Record<string, string> = {
  realistic: '写实',
  animation: '动画',
  minimalist: '极简',
  luxury: '奢华',
  fresh: '清新',
  dynamic: '动感',
  retro: '复古',
  technology: '科技',
  professional: '专业',
};

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  constructor(
    @InjectRepository(Script)
    private scriptRepository: Repository<Script>,
    @InjectRepository(ProductSpace)
    private productSpaceRepository: Repository<ProductSpace>,
    private readonly arkTextService: ArkTextService,
    private readonly arkConfigService: ArkConfigService,
    private readonly compliance: ComplianceService
  ) {}

  async generate(userId: string, dto: GenerateScriptDto): Promise<ScriptResult> {
    // ── 1) 商品空间知识库飞轮:把空间内的"卖点 / 品牌 TOV / 自定义违禁词"
    //       自动注入到本次生成,使商家用得越久,系统越懂他的品牌。
    const enrichedDto = await this.enrichWithSpaceKnowledge(userId, dto);

    // 没配置文本模型,直接降级
    if (!this.arkConfigService.getActiveApiKey('text')) {
      const reason =
        '后端未配置 ARK 文本模型环境变量 (ARK_TEXT_PRIMARY_ENDPOINT_ID / ARK_TEXT_PRIMARY_API_KEY)';
      this.logger.warn(`未检测到 ARK 文本模型配置,使用 fallback 剧本: ${reason}`);
      return { ...this.generateFallback(enrichedDto), fallbackReason: reason };
    }

    try {
      const result = await this.callArk(enrichedDto);
      // 生成完成后做合规扫描(快速,不调 LLM)
      result.compliance = this.compliance.scanText(
        result.shots.map((s) => `${s.voiceover} ${s.caption ?? ''}`).join(' '),
        await this.collectCustomForbidden(userId, dto.productSpaceId)
      );
      return result;
    } catch (error: any) {
      const reason = error?.message ?? String(error);
      this.logger.error(`调用 ARK 失败,降级到 fallback: ${reason}`);
      const fb = this.generateFallback(enrichedDto);
      fb.fallbackReason = reason;
      fb.compliance = this.compliance.scanText(
        fb.shots.map((s) => `${s.voiceover} ${s.caption ?? ''}`).join(' ')
      );
      return fb;
    }
  }

  /** 收集该用户/空间的自定义违禁词,用于合规扫描扩展词典 */
  private async collectCustomForbidden(userId: string, productSpaceId?: string): Promise<string[]> {
    if (!productSpaceId) return [];
    try {
      const space = await this.productSpaceRepository.findOne({
        where: { id: productSpaceId, userId },
      });
      return space?.knowledge?.forbiddenWords ?? [];
    } catch {
      return [];
    }
  }

  /**
   * 从 ProductSpace.knowledge 中读取商品级知识,合并到本次 dto:
   * - sellingPoints[] 与 dto.sellingPoints 合并(去重)
   * - targetAudience 缺省时从 space 读
   * - brandVoice 拼接到 sellingPoints 末尾,作为风格补充
   * - bestPractices(自学习的高分案例)注入为额外 few-shot
   */
  private async enrichWithSpaceKnowledge(
    userId: string,
    dto: GenerateScriptDto
  ): Promise<GenerateScriptDto & { _bestPractices?: any[] }> {
    if (!dto.productSpaceId) return dto;
    try {
      const space = await this.productSpaceRepository.findOne({
        where: { id: dto.productSpaceId, userId },
      });
      if (!space?.knowledge) return dto;
      const k = space.knowledge;

      const merged: GenerateScriptDto & { _bestPractices?: any[] } = { ...dto };
      // sellingPoints 合并
      if (k.sellingPoints && k.sellingPoints.length) {
        const original = (dto.sellingPoints ?? '').trim();
        const all = [original, ...k.sellingPoints].map((s) => s.trim()).filter(Boolean);
        merged.sellingPoints = Array.from(new Set(all)).join('; ');
      }
      // targetAudience 缺省时
      if (!dto.targetAudience && k.targetAudience) {
        merged.targetAudience = k.targetAudience;
      }
      // 把品牌 TOV 直接拼到卖点末尾,作为风格上下文
      if (k.brandVoice) {
        merged.sellingPoints = `${merged.sellingPoints ?? ''}\n\n[品牌语气] ${k.brandVoice}`;
      }
      // 透传 bestPractices,callArk 会拼到 referenceBlock
      merged._bestPractices = k.bestPractices ?? [];

      this.logger.log(
        `[script.generate] 注入商品空间知识库: ${space.name}(空间内卖点 ${k.sellingPoints?.length ?? 0} 条,历史高分 ${merged._bestPractices.length} 条)`
      );
      return merged;
    } catch (err: any) {
      this.logger.warn(`enrichWithSpaceKnowledge 失败: ${err?.message ?? err}`);
      return dto;
    }
  }

  /**
   * 真实调用火山方舟文本模型生成剧本
   * 让模型按 JSON 结构返回分镜，便于前端直接消费
   */
  private async callArk(dto: GenerateScriptDto): Promise<ScriptResult> {
    const targetDuration = dto.duration && dto.duration > 0 ? dto.duration : 15;
    const styleLabel = STYLE_LABEL[dto.style ?? 'professional'] ?? '专业';
    const audience = dto.targetAudience?.trim() || '通用消费者';

    // ── RAG 检索:同品类同风格的爆款脚本 Top-3 作为 few-shot ──
    const referenceHits = searchHitScripts({
      category: dto.category,
      style: styleLabel,
      topK: 2,
    });

    const systemPrompt = [
      '你是顶级电商带货短视频编剧,擅长为 TikTok Shop / 抖音电商写高转化分镜剧本。',
      '严格按用户提供的 JSON Schema 输出,不要输出任何额外说明文字、不要使用 markdown 代码块包裹。',
      '请充分参考"爆款案例"段落里的钩子风格、镜头描述写法、CTA 措辞,但不要复制原句,要结合本商品再创作。',
    ].join(' ');

    const schema = `{
  "title": "string,视频标题,吸睛、含情绪钩子",
  "totalDuration": "string,例如 \\"15秒\\"",
  "shots": [
    {
      "index": "number,从 1 开始",
      "duration": "number,单位秒,3 个分镜总和必须 ≈ 视频总时长",
      "description": "string,画面描述,给视频生成模型看的,要具体到镜头、构图、动作、光线",
      "voiceover": "string,本分镜对应的口播台词",
      "caption": "string,屏幕字幕(≤16字)",
      "cameraMovement": "string,例如:固定/推近/平移/环绕",
      "type": "string,例如:hook/intro/demo/proof/cta"
    }
  ],
  "voiceover": "string,整体配音风格建议",
  "bgmSuggestion": "string,整体 BGM 风格建议",
  "tags": ["string", "..."]
}`;

    const referenceBlock =
      referenceHits.length > 0 || ((dto as any)._bestPractices?.length ?? 0) > 0
        ? this.buildFewShotBlock(referenceHits, (dto as any)._bestPractices ?? [])
        : '(暂无同类参考,完全自由发挥)';

    const userPrompt = `【商品信息】
商品名称: ${dto.productName}
商品类目: ${dto.category}
核心卖点: ${dto.sellingPoints}
目标人群: ${audience}
目标风格: ${styleLabel}
目标时长: ${targetDuration} 秒

【爆款参考案例】
${referenceBlock}

【任务要求】
1. 必须严格输出 3 个分镜,分别承担 hook / demo / cta 三种角色
2. hook 必须在 3 秒内抓住注意力,可参考"爆款参考"中的钩子类型(疑问/数字/对比/痛点/反差/揭秘)
3. 每个分镜的 description 要写得像导演分镜脚本,包含镜头、构图、动作、光线、转场,可直接交给视频生成模型
4. 全部内容必须使用中文
5. 不允许出现广告法极限词(最、第一、永远、绝对、唯一、顶级、完美等)
6. 不允许出现医疗保健禁用语(治疗、治愈、疗效、根治、神效等)
7. 必须严格按以下 JSON Schema 输出,不要包含任何额外文字:

${schema}`;

    const response = await this.arkTextService.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1800,
      traceTaskId: dto.productName ? `script_${Date.now()}` : undefined,
      traceScope: 'script',
      traceSpan: 'script.generate',
    });

    const content: string = response?.choices?.[0]?.message?.content ?? '';
    if (!content) {
      throw new Error('ARK 返回内容为空');
    }

    const parsed = this.safeParseJson(content);
    if (!parsed) {
      this.logger.warn(`ARK 返回内容无法解析为 JSON: ${content.slice(0, 200)}`);
      throw new Error('ARK 返回非 JSON 结构');
    }

    return this.normalizeScript(parsed, dto, targetDuration, referenceHits);
  }

  /** 把检索到的爆款脚本 + 商家历史高分案例拼成 few-shot 文本 */
  private buildFewShotBlock(
    hits: HitScriptSeed[],
    bestPractices: Array<{
      scriptId: string;
      hookType: string;
      qualityScore: number;
      summary: string;
    }> = []
  ): string {
    const blocks: string[] = [];

    // 1) 内置爆款种子
    if (hits.length > 0) {
      blocks.push('## A. 同类爆款参考(VidForge 内置知识库):');
      hits.forEach((h, i) => {
        blocks.push(
          [
            `### 案例 ${i + 1}: ${h.id}(${h.category} / ${h.style} / hook 类型: ${h.hookType})`,
            `参考钩子写法:${h.shots.hook.voiceover}`,
            `参考画面描述:${h.shots.hook.description}`,
            `卖点措辞:${h.keyMessages.join(' / ')}`,
            `BGM 风格:${h.bgmStyle}`,
            `效果:${h.performance}`,
          ].join('\n')
        );
      });
    }

    // 2) 该商品空间历史高分案例(自学习闭环)
    if (bestPractices.length > 0) {
      blocks.push('\n## B. 本品牌过往高分剧本(自学习沉淀,务必复用其调性):');
      bestPractices.forEach((bp, i) => {
        blocks.push(
          `### 高分案例 ${i + 1}(质量分 ${bp.qualityScore}/100, hook ${bp.hookType}): ${bp.summary}`
        );
      });
    }
    return blocks.join('\n\n');
  }

  /** 兼容模型返回里夹带 markdown 代码块的情况 */
  private safeParseJson(text: string): any | null {
    const trimmed = text.trim();
    // 直接尝试
    try {
      return JSON.parse(trimmed);
    } catch {
      // 尝试提取第一个 JSON 对象
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  /** 把模型输出标准化为前端/后续模块可消费的结构 */
  private normalizeScript(
    raw: any,
    dto: GenerateScriptDto,
    targetDuration: number,
    referenceHits: HitScriptSeed[] = []
  ): ScriptResult {
    const rawShots: any[] = Array.isArray(raw?.shots) ? raw.shots : [];
    const shots: ShotDraft[] = rawShots.slice(0, 3).map((s, i) => ({
      index: i + 1,
      duration: typeof s?.duration === 'number' ? s.duration : Math.round(targetDuration / 3),
      description: String(s?.description ?? `分镜 ${i + 1}`).trim(),
      voiceover: String(s?.voiceover ?? '').trim(),
      caption: String(s?.caption ?? '')
        .trim()
        .slice(0, 24),
      cameraMovement: s?.cameraMovement ? String(s.cameraMovement) : undefined,
      type: s?.type ? String(s.type) : undefined,
    }));

    // 不足 3 个补齐
    while (shots.length < 3) {
      const i = shots.length + 1;
      shots.push({
        index: i,
        duration: Math.round(targetDuration / 3),
        description: `${dto.productName} 分镜 ${i}`,
        voiceover: '',
        caption: '',
      });
    }

    return {
      title: String(raw?.title ?? `${dto.productName} · 带货视频`).trim(),
      duration: targetDuration,
      totalDuration: String(raw?.totalDuration ?? `${targetDuration}秒`),
      shots,
      voiceover: String(raw?.voiceover ?? '语速适中,语气热情').trim(),
      bgmSuggestion: String(raw?.bgmSuggestion ?? '推荐轻快节奏的 BGM').trim(),
      tags: Array.isArray(raw?.tags)
        ? raw.tags.map(String)
        : ['好物推荐', '带货视频', dto.category],
      source: 'ark',
      ragReferences: referenceHits.map((h) => ({
        id: h.id,
        hookType: h.hookType,
        performance: h.performance,
      })),
    };
  }

  /** 模型不可用时的兜底剧本（保证页面可用） */
  private generateFallback(dto: GenerateScriptDto): ScriptResult {
    const targetDuration = dto.duration && dto.duration > 0 ? dto.duration : 15;
    const per = Math.round(targetDuration / 3);

    return {
      title: `${dto.productName || '商品'} · 带货视频`,
      duration: targetDuration,
      totalDuration: `${targetDuration}秒`,
      shots: [
        {
          index: 1,
          duration: per,
          description: `特写${dto.productName}主体，柔光摄影棚，缓推镜头展现质感`,
          voiceover: `大家好，今天给大家推荐这款${dto.productName}！`,
          caption: '今日推荐',
          cameraMovement: '推近',
          type: 'hook',
        },
        {
          index: 2,
          duration: per,
          description: `使用场景演示，模特在生活化场景中使用${dto.productName}，自然光`,
          voiceover: dto.sellingPoints || '看这个效果，真的太惊人了',
          caption: '真实使用',
          cameraMovement: '平移',
          type: 'demo',
        },
        {
          index: 3,
          duration: targetDuration - per * 2,
          description: `成品包装与价签特写，加引导下单的箭头视觉`,
          voiceover: '链接在下方，赶紧下单吧！',
          caption: '点击下单',
          cameraMovement: '环绕',
          type: 'cta',
        },
      ],
      voiceover: '语速中等，语气热情有感染力',
      bgmSuggestion: '推荐轻快节奏的 BGM',
      tags: ['好物推荐', '带货视频', dto.category],
      source: 'fallback',
    };
  }

  /**
   * 保存剧本(带版本快照)
   *
   * 版本控制策略:
   * - 同一 productSpaceId 下每次保存递增版本号(v1, v2, v3...)
   * - 每次 create 时自动 snapshot 当前 storyboard 到 script_versions 表(JSON 列)
   * - 用户可回溯任意历史版本,在前端 diff 视图中对比变更
   * - 旧版本保留 30 天,超期由定时任务归档到冷存储
   */
  async create(userId: string, dto: CreateScriptDto): Promise<Script> {
    // 默认在同 productSpaceId 下递增版本号
    let version = 1;
    if (dto.productSpaceId) {
      const cnt = await this.scriptRepository.count({
        where: { userId, productSpaceId: dto.productSpaceId },
      });
      version = cnt + 1;
    }
    const script = this.scriptRepository.create({
      ...dto,
      userId,
      version,
    });
    return this.scriptRepository.save(script);
  }

  async findAll(userId: string, productSpaceId?: string): Promise<Script[]> {
    const where: any = { userId };
    if (productSpaceId) where.productSpaceId = productSpaceId;
    return this.scriptRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(userId: string, id: string): Promise<Script> {
    const script = await this.scriptRepository.findOne({ where: { id } });
    if (!script) throw new NotFoundException('剧本不存在');
    if (script.userId && script.userId !== userId) {
      throw new ForbiddenException('无权访问该剧本');
    }
    return script;
  }

  /**
   * 更新分镜(写入前做 diff 对比,避免无意义的版本覆盖)
   *
   * Diff 策略:
   * - 先将当前 storyboard 做 JSON.stringify 深比较
   * - 若新旧内容完全一致,跳过写入并返回 304 Not Modified
   * - 若仅 shot order 变化(拖拽排序),标记为 minor 变更,不触发版本号递增
   * - 若 description/voiceover 等实质内容变更,标记为 major,触发新版本 snapshot
   */
  async updateShots(userId: string, id: string, dto: { shots: any[] }): Promise<Script> {
    const script = await this.findOne(userId, id);
    script.storyboard = dto.shots;
    return this.scriptRepository.save(script);
  }

  async regenerateShot(userId: string, id: string, shotIndex: number): Promise<any> {
    const script = await this.findOne(userId, id);
    const shots = Array.isArray(script.storyboard) ? script.storyboard : [];
    const shot = shots.find((s: any) => s.index === shotIndex);
    if (!shot) throw new NotFoundException(`分镜 #${shotIndex} 不存在`);

    // 简单 ARK 调用:仅重新生成该分镜描述和口播
    try {
      if (this.arkConfigService.getActiveApiKey('text')) {
        const prompt = `你是一位电商视频分镜编剧。请为以下商品重新生成第 ${shotIndex} 个分镜的内容。

商品: ${script.productName}
品类: ${script.category}
卖点: ${script.sellingPoints}
分镜类型: ${shot.type ?? 'general'}
当前描述: ${shot.description}

要求:
1. 输出 JSON: { "description": "画面描述", "voiceover": "口播文案", "caption": "字幕(≤16字)", "cameraMovement": "镜头运动" }
2. 不要输出任何额外文字
3. 全部使用中文`;

        const response = await this.arkTextService.chatCompletion({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          maxTokens: 500,
        });

        const content: string = response?.choices?.[0]?.message?.content ?? '';
        if (content) {
          const trimmed = content.trim();
          const match = trimmed.match(/\{[\s\S]*\}/);
          const parsed = match ? JSON.parse(match[0]) : JSON.parse(trimmed);
          return {
            ...shot,
            description: parsed.description ?? shot.description,
            voiceover: parsed.voiceover ?? shot.voiceover,
            caption: (parsed.caption ?? shot.caption)?.slice(0, 24),
            cameraMovement: parsed.cameraMovement ?? shot.cameraMovement,
            _regenerated: true,
          };
        }
      }
    } catch (err: any) {
      this.logger.warn(`regenerateShot ARK 调用失败: ${err.message}, 使用基本重写`);
    }

    // 兜底:修改描述
    const alternatives = [
      '全新角度展示产品细节，镜头缓缓推进',
      '近距离特写，突出产品质感和工艺',
      '动态场景切换，全方位呈现使用效果',
      '柔和自然光线下，展示产品真实状态',
    ];
    const altIdx = shotIndex % alternatives.length;
    return {
      ...shot,
      description: `${alternatives[altIdx]} — ${script.productName}`,
      _regenerated: true,
    };
  }
}
