import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';
import { ArkVideoService } from '../../ai/services/ark-video.service';
import { ArkConfigService } from '../../ai/services/ark-config.service';
import { ComposerService, ComposeShotInput } from '../../media/services/composer.service';

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 8 * 60 * 1000;
const MAX_PARALLEL_SHOTS = 3; // ARK Seedance 5 并发,留余量

/**
 * 视频合成 Agent(真实推理化)
 *
 * 真实工作:
 * 1. 检查 ARK 视频模型是否可用
 *    - 不可用 → 直接返回降级结果(占位 URL),让 Quality Agent 据此打分
 * 2. 逐个(限流并行 N=3)调用 ARK Seedance 创建视频任务,轮询直到完成
 *    - image-to-video 分镜携带 firstFrameUrl
 *    - text-to-video 分镜只传 prompt
 * 3. 至少有一段成功 → 调用 ComposerService 做 ffmpeg 合片(含 TTS / BGM / 字幕)
 * 4. 全失败 → 标记 hasRealVideo=false,Quality Agent 会给出低分 + replan
 */
@Injectable()
export class CompositionAgentService {
  private readonly logger = new Logger(CompositionAgentService.name);

  constructor(
    private readonly arkVideo: ArkVideoService,
    private readonly arkConfig: ArkConfigService,
    private readonly composer: ComposerService,
  ) {}

  async compose(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] CompositionAgent 开始合成`);
    const startedAt = new Date();
    const trace = state.trace ?? [];

    const shots = state.scriptGeneration?.shots ?? [];
    if (shots.length === 0) {
      const endedAt = new Date();
      trace.push({
        span: 'video_composition',
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        latencyMs: endedAt.getTime() - startedAt.getTime(),
        status: 'error',
        errorMessage: '剧本无分镜',
      });
      return {
        videoComposition: {
          videoUrl: '',
          duration: 0,
          hasRealVideo: false,
          composed: false,
          shotResults: [],
        },
        trace,
      };
    }

    const totalDuration = shots.reduce((s, sh) => s + sh.duration, 0);

    if (!this.arkConfig.getActiveApiKey('video')) {
      this.logger.warn(`[${state.taskId}] 未配置 ARK 视频模型,跳过真实生成`);
      const endedAt = new Date();
      trace.push({
        span: 'video_composition',
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        latencyMs: endedAt.getTime() - startedAt.getTime(),
        status: 'ok',
        summary: '降级:无 ARK 视频凭证,跳过真实生成',
      });
      return {
        videoComposition: {
          videoUrl: '',
          duration: totalDuration,
          hasRealVideo: false,
          composed: false,
          shotResults: shots.map((s) => ({ shotId: s.id })),
        },
        trace,
      };
    }

    // ── 限流并行生成所有分镜 ──────────────────
    const shotResults: Array<{ shotId: string; videoUrl?: string; error?: string }> = [];
    const successShotInputs: ComposeShotInput[] = [];

    // 分批 chunk
    for (let i = 0; i < shots.length; i += MAX_PARALLEL_SHOTS) {
      const batch = shots.slice(i, i + MAX_PARALLEL_SHOTS);
      const results = await Promise.all(
        batch.map(async (shot) => {
          try {
            const ratio = '9:16';
            const resolution = '720p';
            const created = await this.arkVideo.createTask({
              prompt: this.buildShotPrompt(shot.description, shot.script, shot.cameraMovement),
              ratio: ratio as any,
              resolution: resolution as any,
              firstFrameUrl: shot.materialId ? this.materialUrlOf(state, shot.materialId) : undefined,
              duration: shot.duration,
            });
            shot.arkTaskId = created.id;
            const final = await this.poll(created.id);
            shot.videoUrl = final.videoUrl;
            return { shotId: shot.id, videoUrl: final.videoUrl };
          } catch (err: any) {
            const msg = err?.message ?? String(err);
            this.logger.error(`[${state.taskId}] 分镜 ${shot.order} 失败: ${msg}`);
            shot.errorMessage = msg;
            return { shotId: shot.id, error: msg };
          }
        }),
      );
      shotResults.push(...results);
    }

    for (const shot of shots) {
      if (shot.videoUrl) {
        successShotInputs.push({
          id: shot.id,
          index: shot.order,
          videoUrl: shot.videoUrl,
          duration: shot.duration,
          caption: shot.caption,
          voiceover: shot.script,
        });
      }
    }

    // ── 至少一段成功 → 真实合片 ──────────────
    let finalUrl = '';
    let composed = false;
    if (successShotInputs.length > 0) {
      try {
        const result = await this.composer.compose(successShotInputs, {
          taskId: state.taskId,
          title: state.productName,
          ratio: '9:16',
          resolution: '720p',
          style: state.style,
          burnSubtitle: true,
        });
        finalUrl = result.finalUrl;
        composed = true;
      } catch (err: any) {
        this.logger.error(`[${state.taskId}] Composer 失败,使用首段视频: ${err?.message ?? err}`);
        finalUrl = successShotInputs[0].videoUrl;
        composed = false;
      }
    }

    const endedAt = new Date();
    trace.push({
      span: 'video_composition',
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      latencyMs: endedAt.getTime() - startedAt.getTime(),
      status: 'ok',
      summary: `生成 ${successShotInputs.length}/${shots.length} 分镜成功,合片=${composed}`,
    });

    return {
      videoComposition: {
        videoUrl: finalUrl,
        duration: totalDuration,
        hasRealVideo: successShotInputs.length > 0,
        composed,
        shotResults,
      },
      trace,
    };
  }

  private buildShotPrompt(description: string, script: string, cameraMovement?: string): string {
    const parts = [
      `【画面】${description}`,
      script ? `【口播】${script}` : '',
      cameraMovement ? `【镜头】${cameraMovement}` : '',
      '风格:电商带货短视频,画面干净专业,光线自然,构图聚焦商品',
    ];
    return parts.filter(Boolean).join('\n');
  }

  private materialUrlOf(state: AgentState, materialId: string): string | undefined {
    const m = state.materialAnalysis?.matchedMaterials.find((x) => x.id === materialId);
    return m?.url;
  }

  private async poll(arkTaskId: string): Promise<{ videoUrl: string }> {
    const startedAt = Date.now();
    while (true) {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        throw new Error('ARK 任务轮询超时');
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const remote = await this.arkVideo.queryTask(arkTaskId);
      const status: string = String(remote?.status ?? '').toLowerCase();
      if (status === 'succeeded' || status === 'success') {
        const content = remote?.content ?? remote?.result ?? {};
        const url: string | undefined =
          content?.video_url ?? content?.url ?? remote?.video_url ?? remote?.url;
        if (!url) throw new Error('ARK 返回成功但缺少视频 URL');
        return { videoUrl: url };
      }
      if (status === 'failed' || status === 'cancelled') {
        const errMsg = remote?.error?.message ?? remote?.message ?? `任务状态: ${status}`;
        throw new Error(errMsg);
      }
    }
  }
}
