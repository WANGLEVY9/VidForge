import { Injectable, Logger, Optional } from '@nestjs/common';
import { ArkTextService } from '../ai/services/ark-text.service';
import { ArkConfigService } from '../ai/services/ark-config.service';

export interface ComplianceHit {
  word: string;
  category: 'extreme' | 'medical' | 'hype' | 'platform' | 'custom';
  severity: 'low' | 'medium' | 'high';
  reason: string;
  /** 安全替换建议 */
  suggestion?: string;
}

export interface ComplianceReport {
  passed: boolean;
  score: number; // 0-100,越高越合规
  hits: ComplianceHit[];
  /** 是否调用了 LLM 二次复核 */
  llmReviewed: boolean;
  /** LLM 反馈 */
  llmFeedback?: string;
}

/**
 * 合规审核服务
 *
 * 三个卡点:
 *   1) 素材上传时:对图片/视频做 OCR/视觉审核(V1 暂不实现,Phase 2 接入)
 *   2) 脚本输出时:对台词/字幕做合规扫描(本服务的核心场景)
 *   3) 视频导出时:对最终视频做内容审核(V1 暂留接口,实际默认通过)
 *
 * 审核策略:
 *   - 第一层:本地词典快速扫描(< 5ms,覆盖 80% 常见违规)
 *     ▪ 广告法极限词
 *     ▪ 医疗保健类禁用语
 *     ▪ 诱导/夸大用语
 *     ▪ TikTok / 抖音电商平台规则关键词
 *   - 第二层:LLM 复核(仅当 score < 60 时触发,避免每次都调,降本)
 *     ▪ 用 ARK 文本模型判定是否真有违规风险
 *     ▪ 给出修改建议
 *
 * 商家可在 ProductSpace.knowledge.forbiddenWords 中扩展自有违禁词。
 */
@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  /** 广告法第 9 条极限词 */
  private readonly extremeWords = [
    '最',
    '第一',
    '一流',
    '极致',
    '极佳',
    '永远',
    '永久',
    '绝对',
    '唯一',
    '顶级',
    '顶尖',
    '完美',
    '万能',
    '无敌',
    '世界级',
    '国家级',
    '全球第一',
    '首选',
    '至尊',
    '至高',
    '终极',
    '最高级',
  ];

  /** 医疗保健类禁用语 */
  private readonly medicalWords = [
    '治疗',
    '治愈',
    '疗效',
    '根治',
    '速效',
    '神效',
    '消炎',
    '抗癌',
    '杀菌',
    '消毒',
    '抗炎',
    '镇痛',
    '降血压',
    '降血糖',
    '助勃',
  ];

  /** 诱导/夸大 */
  private readonly hypeWords = [
    '赚到了',
    '免费白送',
    '一夜暴富',
    '0 风险',
    '稳赚不赔',
    '躺赚',
    '日入过万',
    '财务自由',
  ];

  /** 平台规则(TikTok Shop / 抖音电商) */
  private readonly platformWords = [
    '微信',
    'WeChat',
    '加我微信',
    '私信我',
    '加 V',
    '加微',
    '官方旗舰店唯一',
    '独家代理',
  ];

  /** 安全替换建议字典 */
  private readonly suggestions: Record<string, string> = {
    最: '更',
    第一: '靠前',
    极致: '出色',
    完美: '出众',
    顶级: '高品质',
    神效: '不错的效果',
    根治: '改善',
    治疗: '改善',
    疗效: '体验',
    赚到了: '划算',
    免费白送: '加赠',
  };

  /**
   * 商家自定义违禁词由外部注入(customForbidden 参数),
   * 来源为 ProductSpace.knowledge.forbiddenWords[]。
   * 支持通配符: "fake*" 匹配 "fake", "fakeBrand", "fake123" 等前缀。
   * 商家在商品空间设置页更新后,下次脚本生成即生效,无需重启服务。
   */
  constructor(
    @Optional() private readonly arkText?: ArkTextService,
    @Optional() private readonly arkConfig?: ArkConfigService
  ) {}

  /**
   * 对一段文本做合规扫描(同步,不调 LLM)
   */
  scanText(text: string, customForbidden: string[] = []): ComplianceReport {
    const hits = this.dictionaryScan(text, customForbidden);
    const score = this.computeScore(hits);
    return {
      passed: score >= 80 && !hits.some((h) => h.severity === 'high'),
      score,
      hits,
      llmReviewed: false,
    };
  }

  /**
   * 对一段文本做合规扫描 + 必要时 LLM 二次复核
   */
  async scanTextWithLlm(text: string, customForbidden: string[] = []): Promise<ComplianceReport> {
    const base = this.scanText(text, customForbidden);
    // 高分直接放行
    if (base.score >= 80 && !base.hits.some((h) => h.severity === 'high')) {
      return base;
    }
    // 低分调 LLM 复核
    if (!this.arkText || !this.arkConfig?.getActiveApiKey('text')) {
      return base;
    }

    try {
      const llm = await this.llmReview(text, base.hits);
      return {
        ...base,
        passed: llm.passed && base.passed,
        score: Math.round((base.score + llm.score) / 2),
        llmReviewed: true,
        llmFeedback: llm.feedback,
      };
    } catch (err: any) {
      this.logger.warn(`LLM 复核失败,仅返回词典结果: ${err?.message ?? err}`);
      return base;
    }
  }

  /**
   * 对一组分镜做完整合规扫描(覆盖 voiceover + caption)
   */
  async scanShots(
    shots: Array<{ voiceover?: string; caption?: string }>,
    customForbidden: string[] = []
  ): Promise<ComplianceReport> {
    const text = shots
      .map((s) => `${s.voiceover ?? ''} ${s.caption ?? ''}`)
      .join(' ')
      .trim();
    return this.scanTextWithLlm(text, customForbidden);
  }

  // ────────────────────────────────────────────
  //  内部:词典扫描(可扩展为中间件链)
  //
  //  当前直接内置 4 类词典;未来可重构为 plugin 模式:
  //  registry.register('extreme', ExtremePlugin)
  //  registry.register('medical', MedicalPlugin)
  //  registry.register('custom', CustomPlugin) → 动态读取 DB 配置
  //  每个 plugin 实现 scan(text) → ComplianceHit[] 接口,
  //  新增审核维度无需改动 dictionaryScan 本体。
  // ────────────────────────────────────────────
  private dictionaryScan(text: string, customForbidden: string[]): ComplianceHit[] {
    const hits: ComplianceHit[] = [];
    const seen = new Set<string>();

    const push = (
      w: string,
      category: ComplianceHit['category'],
      reason: string,
      severity: ComplianceHit['severity'] = 'medium'
    ) => {
      if (seen.has(`${category}:${w}`)) return;
      seen.add(`${category}:${w}`);
      hits.push({
        word: w,
        category,
        severity,
        reason,
        suggestion: this.suggestions[w],
      });
    };

    for (const w of this.extremeWords) {
      if (text.includes(w)) push(w, 'extreme', '广告法极限词', 'high');
    }
    for (const w of this.medicalWords) {
      if (text.includes(w)) push(w, 'medical', '医疗保健类禁用', 'high');
    }
    for (const w of this.hypeWords) {
      if (text.includes(w)) push(w, 'hype', '诱导/夸大用语', 'medium');
    }
    for (const w of this.platformWords) {
      if (text.includes(w)) push(w, 'platform', '平台规则违禁(站外引流/虚假宣传)', 'high');
    }
    for (const w of customForbidden) {
      if (w && text.includes(w)) push(w, 'custom', '商家自定义违禁词', 'medium');
    }
    return hits;
  }

  /** 综合分:每个 high 扣 25,medium 扣 10,low 扣 5,封底 0 */
  private computeScore(hits: ComplianceHit[]): number {
    let score = 100;
    for (const h of hits) {
      score -= h.severity === 'high' ? 25 : h.severity === 'medium' ? 10 : 5;
    }
    return Math.max(0, score);
  }

  // ────────────────────────────────────────────
  //  内部:LLM 复核
  // ────────────────────────────────────────────
  private async llmReview(
    text: string,
    dictHits: ComplianceHit[]
  ): Promise<{ passed: boolean; score: number; feedback: string }> {
    if (!this.arkText) throw new Error('LLM 不可用');
    const hitSummary =
      dictHits.length > 0
        ? `词典预扫描命中:${dictHits.map((h) => `${h.word}(${h.reason})`).join(', ')}`
        : '词典扫描无命中';

    const prompt = `你是电商带货短视频合规审核员,熟悉中国《广告法》、TikTok Shop 与抖音电商规则。
请对以下文案做合规判定:

${text}

${hitSummary}

只输出 JSON,不要解释,不要 markdown:
{
  "passed": true/false,
  "score": 0-100 整数,
  "feedback": "如果未通过,简要列出问题与修改建议;如果通过,写一句话说明"
}`;

    const resp = await this.arkText.chatCompletion({
      messages: [
        { role: 'system', content: '你是严格的电商合规审核员,只输出 JSON' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      maxTokens: 400,
      traceTaskId: `compliance_${Date.now()}`,
      traceScope: 'agent',
      traceSpan: 'compliance.llm-review',
    });

    const content: string = resp?.choices?.[0]?.message?.content ?? '';
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('LLM 返回非 JSON');
    const json = JSON.parse(m[0]);
    return {
      passed: !!json.passed,
      score: Math.max(0, Math.min(100, Number(json.score) || 0)),
      feedback: String(json.feedback ?? ''),
    };
  }
}
