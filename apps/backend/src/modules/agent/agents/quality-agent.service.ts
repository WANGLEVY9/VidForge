import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';
import { ArkTextService } from '../../ai/services/ark-text.service';
import { ArkConfigService } from '../../ai/services/ark-config.service';

/**
 * 质量评估 Agent(真实多维度打分)
 *
 * 评分维度(各项 0-100):
 * - completeness: 内容完整性(分镜成功率)
 * - duration:     时长是否在 8-20 秒理想区间
 * - consistency:  剧本台词与画面描述的一致性(LLM 多维度判定)
 * - compliance:   合规性(无极限词 / 无医疗保健禁忌词 / 无诱导词)
 * - hookStrength: 钩子强度(开头 3 秒是否有强情绪挂钩)
 *
 * 综合分 = 加权平均
 *   质量分 < 70 → passed=false → 回到 video_composition 重做
 *   反馈以自然语言形式拼回 ScriptAgent 的 prompt(self-reflection)
 *
 * 合规检查为本地正则,不调外部审核(降低延迟,Phase 2 再接火山审核 API)。
 */
@Injectable()
export class QualityAgentService {
  private readonly logger = new Logger(QualityAgentService.name);

  /** 极限词 / 绝对化用语(广告法第 9 条) */
  private readonly forbiddenWords = [
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
  ];
  /** 医疗保健类禁用语(电商常见违规) */
  private readonly medicalForbidden = [
    '治疗',
    '治愈',
    '疗效',
    '根治',
    '速效',
    '神效',
    '消炎',
    '抗癌',
  ];
  /** 诱导/夸大用语 */
  private readonly hypeForbidden = ['赚到了', '免费白送', '一夜暴富'];

  constructor(
    private readonly arkText: ArkTextService,
    private readonly arkConfig: ArkConfigService
  ) {}

  async evaluate(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] QualityAgent 评估`);
    const startedAt = new Date();
    const trace = state.trace ?? [];

    const shots = state.scriptGeneration?.shots ?? [];
    const composition = state.videoComposition;
    const issues: NonNullable<AgentState['qualityControl']>['issues'] = [];

    // ── 1) 内容完整性 ──────────────────────
    const successCount = shots.filter((s) => s.videoUrl).length;
    const completeness = shots.length > 0 ? Math.round((successCount / shots.length) * 100) : 0;
    if (composition && composition.hasRealVideo === false) {
      issues.push({
        dimension: 'completeness',
        severity: 'high',
        message: '未走真实视频生成(可能是模型未配置或 API 失败)',
        suggestion: '检查 ARK 视频凭证配置',
      });
    } else if (completeness < 100) {
      const failedShots = shots.filter((s) => !s.videoUrl);
      for (const fs of failedShots) {
        issues.push({
          shotId: fs.id,
          dimension: 'completeness',
          severity: 'medium',
          message: `分镜 ${fs.order} 生成失败: ${fs.errorMessage ?? '未知'}`,
          suggestion: '简化画面描述或减少镜头运动元素',
        });
      }
    }

    // ── 2) 时长达标 ────────────────────────
    const totalDuration = shots.reduce((s, sh) => s + sh.duration, 0);
    let duration = 100;
    if (totalDuration < 8) {
      duration = 60;
      issues.push({
        dimension: 'duration',
        severity: 'medium',
        message: `总时长 ${totalDuration}s 偏短(<8s),完播率会偏高但信息量不足`,
      });
    } else if (totalDuration > 20) {
      duration = 70;
      issues.push({
        dimension: 'duration',
        severity: 'medium',
        message: `总时长 ${totalDuration}s 偏长(>20s),完播率会下降`,
        suggestion: '考虑压缩 demo 段',
      });
    }

    // ── 3) 合规性(本地词典) ─────────────────
    const allText = shots.map((s) => `${s.script} ${s.caption ?? ''}`).join(' ');
    const compHits = this.checkCompliance(allText);
    const compliance = Math.max(0, 100 - compHits.length * 25);
    for (const hit of compHits) {
      issues.push({
        dimension: 'compliance',
        severity: hit.severity,
        message: `命中违禁词: ${hit.word} (${hit.reason})`,
        suggestion: `替换或删除"${hit.word}"`,
      });
    }

    // ── 4) 一致性 + 钩子(LLM 多维评分) ─────────
    let consistency = 70;
    let hookStrength = 70;
    if (this.arkConfig.getActiveApiKey('text') && shots.length > 0) {
      try {
        const llmScore = await this.scoreByLlm(state);
        consistency = llmScore.consistency;
        hookStrength = llmScore.hookStrength;
        if (consistency < 70) {
          issues.push({
            dimension: 'consistency',
            severity: 'medium',
            message: `画面-台词一致性 ${consistency},画面与 voiceover 描述方向不一致`,
            suggestion: '让画面 description 更贴合 voiceover 提到的卖点',
          });
        }
        if (hookStrength < 60) {
          issues.push({
            dimension: 'hookStrength',
            severity: 'high',
            message: `开头 hook 偏弱 (${hookStrength}/100),前 3 秒抓不住眼球`,
            suggestion: '换成"对比/疑问/数字冲击"型 hook,例如"为什么 90% 的人选这款?"',
          });
        }
      } catch (err: any) {
        this.logger.warn(`LLM 评分失败,使用启发式分: ${err?.message ?? err}`);
      }
    }

    // ── 5) 综合分 + feedback ──────────────────
    const qualityScore = Math.round(
      completeness * 0.3 +
        duration * 0.15 +
        consistency * 0.2 +
        compliance * 0.2 +
        hookStrength * 0.15
    );
    const passed = qualityScore >= 70 && compHits.length === 0;
    const feedback = this.buildFeedback(issues, qualityScore);

    const endedAt = new Date();
    trace.push({
      span: 'quality_control',
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      latencyMs: endedAt.getTime() - startedAt.getTime(),
      status: 'ok',
      summary: `综合分 ${qualityScore},通过=${passed},问题 ${issues.length} 个`,
    });

    return {
      qualityControl: {
        qualityScore,
        passed,
        dimensions: {
          completeness,
          duration,
          consistency,
          compliance,
          hookStrength,
        },
        issues,
        feedback,
      },
      trace,
    };
  }

  // ──────────────────────────────────────
  //  内部工具
  // ──────────────────────────────────────

  private checkCompliance(
    text: string
  ): Array<{ word: string; reason: string; severity: 'low' | 'medium' | 'high' }> {
    const hits: Array<{ word: string; reason: string; severity: 'low' | 'medium' | 'high' }> = [];
    for (const w of this.forbiddenWords) {
      if (text.includes(w)) hits.push({ word: w, reason: '广告法极限词', severity: 'high' });
    }
    for (const w of this.medicalForbidden) {
      if (text.includes(w)) hits.push({ word: w, reason: '医疗保健类禁用', severity: 'high' });
    }
    for (const w of this.hypeForbidden) {
      if (text.includes(w)) hits.push({ word: w, reason: '诱导/夸大', severity: 'medium' });
    }
    return hits;
  }

  private buildFeedback(
    issues: NonNullable<AgentState['qualityControl']>['issues'],
    qualityScore: number
  ): string {
    if (issues.length === 0) return `当前剧本质量良好(${qualityScore}/100),可直接输出`;
    const high = issues.filter((i) => i.severity === 'high');
    const medium = issues.filter((i) => i.severity === 'medium');
    const lines: string[] = [`本次剧本综合分 ${qualityScore}/100,需要重做以下方面:`];
    high.forEach((i) =>
      lines.push(`- [严重] ${i.message}${i.suggestion ? ` → 建议: ${i.suggestion}` : ''}`)
    );
    medium.forEach((i) =>
      lines.push(`- [中等] ${i.message}${i.suggestion ? ` → 建议: ${i.suggestion}` : ''}`)
    );
    return lines.join('\n');
  }

  private async scoreByLlm(
    state: AgentState
  ): Promise<{ consistency: number; hookStrength: number }> {
    const shots = state.scriptGeneration?.shots ?? [];
    const compactPlan = shots
      .map(
        (s) =>
          `分镜${s.order}(${s.role ?? ''}, ${s.duration}s):画面=${s.description}; 台词=${s.script}`
      )
      .join('\n');

    const prompt = `你是电商短视频质量评估专家,基于以下分镜剧本严格打分。

商品: ${state.productName}
卖点: ${state.sellingPoints}

剧本:
${compactPlan}

评估两个维度,各 0-100 整数分:
1) consistency: 画面描述与台词的一致性(画面在表达的内容是否与台词的卖点同步)
2) hookStrength: 第 1 个分镜作为 3 秒钩子,能否抓住电商短视频用户(疑问/数字/对比/冲突 都属于强钩子)

只输出 JSON,不要解释,不要 markdown:
{"consistency": <0-100>, "hookStrength": <0-100>}`;

    const resp = await this.arkText.chatCompletion({
      messages: [
        { role: 'system', content: '你是严格的短视频内容评估专家,只输出 JSON' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 200,
    });
    const content: string = resp?.choices?.[0]?.message?.content ?? '';
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('LLM 评分非 JSON');
    const json = JSON.parse(m[0]);
    return {
      consistency: clampScore(json.consistency),
      hookStrength: clampScore(json.hookStrength),
    };
  }
}

function clampScore(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 70;
  return Math.max(0, Math.min(100, Math.round(n)));
}
