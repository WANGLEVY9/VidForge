import { Injectable, Logger } from '@nestjs/common';
import { AgentState, ShotOutput } from '../interfaces/agent-state.interface';
import { ScriptService } from '../../script/script.service';

/**
 * 剧本生成 Agent
 *
 * 真实工作:
 * 1. 调用 ScriptService.generate (走 ARK Doubao-Seed-2.0-pro)
 * 2. 拿到 3 个分镜后,把 Material Agent 检索到的 Top-K 素材按相关度
 *    依次绑定到分镜上(image-to-video),没绑上的用 text-to-video
 * 3. 把质量反馈(qualityControl.feedback)拼回 prompt,实现 self-reflection
 */
@Injectable()
export class ScriptAgentService {
  private readonly logger = new Logger(ScriptAgentService.name);

  constructor(private readonly scriptService: ScriptService) {}

  async generate(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] ScriptAgent 生成剧本: ${state.productName}`);
    const startedAt = new Date();
    const trace = state.trace ?? [];

    // 把上一次质量反馈拼到卖点里(简单 self-reflection 实现)
    const feedback = state.qualityControl?.feedback;
    const sellingPoints = feedback
      ? `${state.sellingPoints}\n\n[上次评估反馈,请规避以下问题]\n${feedback}`
      : state.sellingPoints;

    let scriptResult;
    try {
      scriptResult = await this.scriptService.generate(state.userId ?? 'agent', {
        productName: state.productName,
        category: state.category,
        sellingPoints,
        targetAudience: state.targetAudience,
        style: state.style,
        duration: state.duration,
      });
    } catch (err: any) {
      const endedAt = new Date();
      trace.push({
        span: 'script_generation',
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        latencyMs: endedAt.getTime() - startedAt.getTime(),
        status: 'error',
        errorMessage: err?.message ?? String(err),
      });
      throw err;
    }

    // 把检索到的素材绑定到分镜
    const materials = state.materialAnalysis?.matchedMaterials ?? [];
    const shots: ShotOutput[] = scriptResult.shots.map((s, idx) => {
      const linkedMaterial = materials[idx];
      const useImage = !!linkedMaterial?.url;
      return {
        id: `shot_${state.taskId}_${idx + 1}`,
        order: s.index,
        description: s.description,
        duration: s.duration,
        type: useImage ? 'image-to-video' : 'text-to-video',
        script: s.voiceover,
        caption: s.caption,
        cameraMovement: s.cameraMovement,
        role: s.type,
        materialId: linkedMaterial?.id,
      };
    });

    const endedAt = new Date();
    trace.push({
      span: 'script_generation',
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      latencyMs: endedAt.getTime() - startedAt.getTime(),
      status: 'ok',
      summary: `剧本来源 ${scriptResult.source},${shots.length} 个分镜,${shots.filter((x) => x.type === 'image-to-video').length} 个绑定素材`,
    });

    return {
      scriptGeneration: {
        shots,
        voiceover: scriptResult.voiceover,
        style: scriptResult.style ?? state.style ?? 'professional',
        source: scriptResult.source,
        fallbackReason: scriptResult.fallbackReason,
      },
      trace,
    };
  }
}
