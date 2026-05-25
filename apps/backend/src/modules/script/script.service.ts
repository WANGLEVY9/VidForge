import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Script } from './entities/script.entity';
import { CreateScriptDto } from './dto/create-script.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { ArkTextService } from '../ai/services/ark-text.service';
import { ArkConfigService } from '../ai/services/ark-config.service';

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
    private readonly arkTextService: ArkTextService,
    private readonly arkConfigService: ArkConfigService,
  ) {}

  async generate(dto: GenerateScriptDto): Promise<ScriptResult> {
    // 没配置文本模型，直接降级
    if (!this.arkConfigService.getActiveApiKey('text')) {
      this.logger.warn('未检测到 ARK 文本模型配置，使用 fallback 剧本');
      return this.generateFallback(dto);
    }

    try {
      const result = await this.callArk(dto);
      return result;
    } catch (error: any) {
      this.logger.error(`调用 ARK 失败，降级到 fallback: ${error?.message ?? error}`);
      return this.generateFallback(dto);
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

    const systemPrompt = [
      '你是顶级电商带货短视频编剧，擅长为 TikTok Shop / 抖音电商写高转化分镜剧本。',
      '严格按用户提供的 JSON Schema 输出，不要输出任何额外说明文字、不要使用 markdown 代码块包裹。',
    ].join(' ');

    const schema = `{
  "title": "string，视频标题，吸睛、含情绪钩子",
  "totalDuration": "string，例如 \\"15秒\\"",
  "shots": [
    {
      "index": "number，从 1 开始",
      "duration": "number，单位秒，3 个分镜总和必须 ≈ 视频总时长",
      "description": "string，画面描述，给视频生成模型看的，要具体到镜头、构图、动作、光线",
      "voiceover": "string，本分镜对应的口播台词",
      "caption": "string，屏幕字幕（≤16字）",
      "cameraMovement": "string，例如：固定/推近/平移/环绕",
      "type": "string，例如：hook/intro/demo/proof/cta"
    }
  ],
  "voiceover": "string，整体配音风格建议",
  "bgmSuggestion": "string，整体 BGM 风格建议",
  "tags": ["string", "..."]
}`;

    const userPrompt = `请基于以下商品信息，输出 3 个分镜的带货短视频剧本，总时长 ${targetDuration} 秒，风格：${styleLabel}。

商品名称: ${dto.productName}
商品类目: ${dto.category}
核心卖点: ${dto.sellingPoints}
目标人群: ${audience}

要求：
1. 必须严格输出 3 个分镜，分别承担 hook / demo / cta 三种角色
2. 每个分镜的 description 字段要写得像导演分镜脚本，可直接交给 AI 视频生成模型
3. 全部内容必须使用中文
4. 不允许出现违规、夸大、绝对化用语

请按以下 JSON Schema 输出，不要包含任何额外文字：
${schema}`;

    const response = await this.arkTextService.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1500,
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

    return this.normalizeScript(parsed, dto, targetDuration);
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
  private normalizeScript(raw: any, dto: GenerateScriptDto, targetDuration: number): ScriptResult {
    const rawShots: any[] = Array.isArray(raw?.shots) ? raw.shots : [];
    const shots: ShotDraft[] = rawShots.slice(0, 3).map((s, i) => ({
      index: i + 1,
      duration: typeof s?.duration === 'number' ? s.duration : Math.round(targetDuration / 3),
      description: String(s?.description ?? `分镜 ${i + 1}`).trim(),
      voiceover: String(s?.voiceover ?? '').trim(),
      caption: String(s?.caption ?? '').trim().slice(0, 24),
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
      voiceover: String(raw?.voiceover ?? '语速适中，语气热情').trim(),
      bgmSuggestion: String(raw?.bgmSuggestion ?? '推荐轻快节奏的 BGM').trim(),
      tags: Array.isArray(raw?.tags) ? raw.tags.map(String) : ['好物推荐', '带货视频', dto.category],
      source: 'ark',
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

  async create(dto: CreateScriptDto): Promise<Script> {
    const script = this.scriptRepository.create(dto);
    return this.scriptRepository.save(script);
  }

  async findAll(): Promise<Script[]> {
    return this.scriptRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Script> {
    return this.scriptRepository.findOneOrFail({ where: { id } });
  }
}
