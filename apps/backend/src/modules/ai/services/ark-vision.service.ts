import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ArkConfigService } from './ark-config.service';
import { ARK_BASE_URL, ARK_API_PATHS } from '../config/ark.config';

export interface VisionUnderstandResult {
  /** 商品维度 */
  product: {
    /** 主体名称(如"无线耳机") */
    name?: string;
    /** 类目(3C/美妆/服饰/食品/家居 等) */
    category?: string;
    /** 品牌(若可识别) */
    brand?: string | null;
    /** 颜色集(主色 hex) */
    colors?: string[];
    /** 材质 */
    material?: string;
  };
  /** 画面/视频维度 */
  scene: {
    /** 场景类型(室内/户外/演播室/手持/特写) */
    scene?: string;
    /** 镜头(特写/中景/全景) */
    shot?: string;
    /** 构图(居中/对角线/三分) */
    composition?: string;
    /** 光线(柔光/硬光/逆光) */
    lighting?: string;
    /** 风格(写实/极简/复古/科技) */
    style?: string;
  };
  /** 剪辑维度(供检索) */
  clip: {
    /** 主要物体 / 元素 */
    objects?: string[];
    /** 文字内容(若有 OCR 风险也只返回主要可读文本) */
    text?: string | null;
    /** 情绪标签(欢快/沉静/紧张/温暖) */
    mood?: string;
    /** 适合的视频用途(开场/卖点/演示/CTA) */
    suitableFor?: string[];
  };
  /** 模型对图片的一句话描述,作为后续 embedding 输入 */
  caption: string;
}

const VISION_SYSTEM_PROMPT = `你是电商带货视频的素材标注专家。
对输入图片做多维度结构化分析,严格只输出 JSON,不要解释。
要求 JSON 结构:
{
  "product": { "name": string?, "category": string?, "brand": string|null, "colors": string[]?, "material": string? },
  "scene":   { "scene": string?, "shot": string?, "composition": string?, "lighting": string?, "style": string? },
  "clip":    { "objects": string[]?, "text": string|null, "mood": string?, "suitableFor": string[]? },
  "caption": string
}
注意:
- caption 用一句话(<=30字)描述画面,适合作为后续向量检索的输入
- category 限定在: 3C数码 / 美妆个护 / 服饰鞋包 / 食品饮料 / 家居家电 / 母婴 / 运动户外 / 其他
- mood 限定在: 欢快 / 温暖 / 高级 / 紧张 / 清新 / 神秘
- suitableFor 限定在: 开场hook / 卖点演示 / 使用场景 / 用户证言 / CTA 中的若干项
- 不要有 markdown,不要有 \`\`\`,只输出纯 JSON`;

/**
 * 视觉理解服务
 *
 * 复用 ARK 文本主模型 (Doubao-Seed-2.0-pro,具备视觉理解能力)
 * 通过 OpenAI 兼容的 multimodal messages 协议传 image_url 给模型,
 * 强制返回结构化 JSON。
 */
@Injectable()
export class ArkVisionService {
  private readonly logger = new Logger(ArkVisionService.name);

  constructor(private readonly arkConfig: ArkConfigService) {}

  /**
   * 对单张图片做结构化标注
   * @param imageUrl 图片 URL(必须是公网可访问的 URL,或 base64 data URL)
   */
  async understandImage(imageUrl: string): Promise<VisionUnderstandResult> {
    const active = this.arkConfig.getActiveApiKey('text');
    if (!active) throw new Error('未配置文本/视觉模型');

    const body = {
      model: active.endpointId,
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: '请按规定 JSON 结构输出标注结果。' },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 800,
    };

    try {
      const resp = await axios.post(`${ARK_BASE_URL}${ARK_API_PATHS.CHAT_COMPLETIONS}`, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${active.apiKey}`,
        },
        timeout: 90000,
      });

      const raw: string = resp.data?.choices?.[0]?.message?.content ?? '';
      const parsed = this.safeParseJson(raw);
      if (!parsed) {
        this.logger.warn(`视觉模型返回非 JSON,使用兜底:${raw.slice(0, 200)}`);
        return this.fallbackResult(imageUrl);
      }
      return this.normalize(parsed, imageUrl);
    } catch (err: any) {
      this.logger.error(
        `视觉理解失败: ${err?.response?.data?.error?.message ?? err?.message ?? err}`
      );
      return this.fallbackResult(imageUrl);
    }
  }

  /** 简单兜底:让上层流程不被打断 */
  private fallbackResult(imageUrl: string): VisionUnderstandResult {
    return {
      product: { category: '其他', colors: [], brand: null },
      scene: { style: '写实' },
      clip: { objects: [], text: null, mood: '温暖', suitableFor: ['卖点演示'] },
      caption: '商品素材',
    };
  }

  private safeParseJson(raw: string): any | null {
    if (!raw) return null;
    let text = raw.trim();
    // 去掉 markdown 代码块包裹
    if (text.startsWith('```')) {
      text = text
        .replace(/^```(json)?/i, '')
        .replace(/```$/, '')
        .trim();
    }
    try {
      return JSON.parse(text);
    } catch {
      // 尝试从中间抠 JSON
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch {
          /* fallthrough */
        }
      }
      return null;
    }
  }

  private normalize(p: any, _imageUrl: string): VisionUnderstandResult {
    return {
      product: {
        name: p?.product?.name ?? undefined,
        category: p?.product?.category ?? '其他',
        brand: p?.product?.brand ?? null,
        colors: Array.isArray(p?.product?.colors) ? p.product.colors.slice(0, 5) : [],
        material: p?.product?.material ?? undefined,
      },
      scene: {
        scene: p?.scene?.scene ?? undefined,
        shot: p?.scene?.shot ?? undefined,
        composition: p?.scene?.composition ?? undefined,
        lighting: p?.scene?.lighting ?? undefined,
        style: p?.scene?.style ?? '写实',
      },
      clip: {
        objects: Array.isArray(p?.clip?.objects) ? p.clip.objects.slice(0, 10) : [],
        text: p?.clip?.text ?? null,
        mood: p?.clip?.mood ?? '温暖',
        suitableFor: Array.isArray(p?.clip?.suitableFor)
          ? p.clip.suitableFor.slice(0, 5)
          : ['卖点演示'],
      },
      caption: typeof p?.caption === 'string' ? p.caption.slice(0, 80) : '商品素材',
    };
  }
}
