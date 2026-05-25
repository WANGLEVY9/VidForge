import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreationTask } from './entities/creation-task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreationGateway } from './gateway/creation.gateway';
import { RegenerateShotDto } from './dto/regenerate-shot.dto';
import { ArkVideoService, VideoGenerationOptions } from '../ai/services/ark-video.service';
import { ArkConfigService } from '../ai/services/ark-config.service';

interface ShotState {
  id: string;
  index: number;
  description: string;
  voiceover?: string;
  caption?: string;
  duration?: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  taskId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 8 * 60 * 1000; // 单分镜最多 8 分钟

@Injectable()
export class CreationService {
  private readonly logger = new Logger(CreationService.name);

  constructor(
    @InjectRepository(CreationTask)
    private taskRepository: Repository<CreationTask>,
    private creationGateway: CreationGateway,
    private readonly arkVideoService: ArkVideoService,
    private readonly arkConfigService: ArkConfigService,
  ) {}

  async createTask(dto: CreateTaskDto): Promise<CreationTask> {
    // 规范化 storyboard：补 id / 默认状态
    const inputShots = Array.isArray(dto.storyboard) ? dto.storyboard : [];
    const shots: ShotState[] = inputShots.slice(0, 5).map((s, i) => ({
      id: String(s?.id ?? `shot_${Date.now()}_${i + 1}`),
      index: typeof s?.index === 'number' ? s.index : i + 1,
      description: String(s?.description ?? `${dto.title} 分镜 ${i + 1}`),
      voiceover: s?.voiceover ? String(s.voiceover) : undefined,
      caption: s?.caption ? String(s.caption) : undefined,
      duration: typeof s?.duration === 'number' ? s.duration : 5,
      status: 'pending',
    }));

    const task = this.taskRepository.create({
      title: dto.title,
      storyboard: shots as any,
      status: 'pending',
      progress: 0,
      scriptId: (dto as any).scriptId,
    });
    const saved = await this.taskRepository.save(task);

    // 异步触发，不阻塞 HTTP 响应
    void this.processTask(saved.id, dto).catch((err) => {
      this.logger.error(`[${saved.id}] processTask 异常: ${err?.message ?? err}`);
    });

    return saved;
  }

  /**
   * 真实视频生成主流程：
   * 1) 校验配置 → 否则降级到模拟模式
   * 2) 逐分镜创建 ARK 任务并轮询，期间通过 WS 推进度
   * 3) 全部完成后写回 result，emitComplete
   */
  private async processTask(taskId: string, dto: CreateTaskDto): Promise<void> {
    const hasArk = !!this.arkConfigService.getActiveApiKey('video');
    if (!hasArk) {
      this.logger.warn(`[${taskId}] 未配置 ARK 视频模型，使用降级模拟流程`);
      return this.processMock(taskId);
    }

    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) return;

    const shots: ShotState[] = (task.storyboard as any[]) ?? [];
    if (shots.length === 0) {
      await this.fail(taskId, '分镜列表为空');
      return;
    }

    task.status = 'processing';
    task.progress = 5;
    await this.taskRepository.save(task);
    this.creationGateway.emitProgress(taskId, {
      progress: 5,
      status: 'processing',
      message: `开始生成 ${shots.length} 个分镜...`,
    });

    const aspectRatio = (dto.aspectRatio as VideoGenerationOptions['ratio']) || '9:16';
    const resolution = (dto.quality as VideoGenerationOptions['resolution']) || '720p';

    const completedUrls: string[] = [];

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const shotProgressBase = 5 + Math.floor((i / shots.length) * 90);

      shot.status = 'generating';
      await this.persistShots(taskId, shots);
      this.creationGateway.emitShotProgress(taskId, {
        shotId: shot.id,
        progress: 0,
        status: 'generating',
        message: `分镜 ${shot.index}：创建生成任务...`,
      });
      this.creationGateway.emitProgress(taskId, {
        progress: shotProgressBase,
        status: 'processing',
        message: `分镜 ${i + 1}/${shots.length}：创建生成任务...`,
      });

      try {
        const arkPrompt = this.buildShotPrompt(shot, dto.title, aspectRatio, resolution);
        const created = await this.arkVideoService.createTask({
          prompt: arkPrompt,
          ratio: aspectRatio,
          resolution,
          duration: shot.duration,
        });
        shot.taskId = created.id;
        await this.persistShots(taskId, shots);

        const finalState = await this.pollUntilDone(taskId, shot, shotProgressBase, shots.length, i);
        shot.videoUrl = finalState.videoUrl;
        shot.thumbnailUrl = finalState.thumbnailUrl;
        shot.status = 'completed';
        completedUrls.push(finalState.videoUrl ?? '');

        await this.persistShots(taskId, shots);
        this.creationGateway.emitShotProgress(taskId, {
          shotId: shot.id,
          progress: 100,
          status: 'completed',
          message: `分镜 ${shot.index} 生成完成`,
        });
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        this.logger.error(`[${taskId}] 分镜 ${shot.index} 生成失败: ${msg}`);
        shot.status = 'failed';
        shot.errorMessage = msg;
        await this.persistShots(taskId, shots);
        this.creationGateway.emitShotProgress(taskId, {
          shotId: shot.id,
          progress: 0,
          status: 'failed',
          message: `分镜 ${shot.index} 失败: ${msg}`,
        });
        // 单分镜失败不中止整体（让其他分镜尽力完成）
      }
    }

    const successCount = shots.filter((s) => s.status === 'completed').length;
    if (successCount === 0) {
      await this.fail(taskId, '所有分镜均生成失败');
      return;
    }

    const finalTask = await this.taskRepository.findOneOrFail({ where: { id: taskId } });
    finalTask.status = successCount === shots.length ? 'completed' : 'completed';
    finalTask.progress = 100;
    finalTask.result = {
      shots: shots.map((s) => ({
        id: s.id,
        index: s.index,
        videoUrl: s.videoUrl,
        thumbnailUrl: s.thumbnailUrl,
        status: s.status,
        errorMessage: s.errorMessage,
      })),
      // V0 阶段未做 ffmpeg 拼接，直接给前端首个成功分镜的 URL 作为预览
      url: completedUrls.find(Boolean) ?? '',
      duration: shots.reduce((sum, s) => sum + (s.duration ?? 0), 0),
      successCount,
      totalCount: shots.length,
    };
    await this.taskRepository.save(finalTask);

    this.creationGateway.emitComplete(taskId, {
      progress: 100,
      status: 'completed',
      result: finalTask.result,
    });
    this.logger.log(`[${taskId}] 任务完成：${successCount}/${shots.length} 分镜成功`);
  }

  /**
   * 轮询单个分镜的 ARK 任务直到 succeeded/failed/timeout
   * 期间持续 emit 阶段性进度
   */
  private async pollUntilDone(
    taskId: string,
    shot: ShotState,
    shotProgressBase: number,
    totalShots: number,
    shotIndex: number,
  ): Promise<{ videoUrl?: string; thumbnailUrl?: string }> {
    if (!shot.taskId) throw new Error('shot.taskId 缺失');

    const startedAt = Date.now();
    let polls = 0;
    while (true) {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        throw new Error(`分镜 ${shot.index} 轮询超时`);
      }

      await this.delay(POLL_INTERVAL_MS);
      polls += 1;

      const remote = await this.arkVideoService.queryTask(shot.taskId);
      const status: string = remote?.status ?? 'pending';
      // ARK 视频任务的 status 文档：queued / running / succeeded / failed / cancelled
      const normalizedStatus = String(status).toLowerCase();

      // 估算当前分镜进度（在 [shotProgressBase, shotProgressBase+90/totalShots] 区间内推进）
      const slotWidth = 90 / totalShots;
      const within = Math.min(0.9, polls * 0.1); // 每次轮询逼近 10%，封顶 90%
      const overall = Math.round(shotProgressBase + within * slotWidth);

      this.creationGateway.emitProgress(taskId, {
        progress: overall,
        status: 'processing',
        message: `分镜 ${shotIndex + 1}/${totalShots}：${this.statusLabel(normalizedStatus)}`,
      });
      this.creationGateway.emitShotProgress(taskId, {
        shotId: shot.id,
        progress: Math.round(within * 100),
        status: 'generating',
        message: this.statusLabel(normalizedStatus),
      });

      if (normalizedStatus === 'succeeded' || normalizedStatus === 'success') {
        const content = remote?.content ?? remote?.result ?? {};
        const videoUrl: string | undefined =
          content?.video_url ?? content?.url ?? remote?.video_url ?? remote?.url;
        const thumbnailUrl: string | undefined =
          content?.thumbnail_url ?? remote?.thumbnail_url;
        if (!videoUrl) {
          throw new Error('ARK 返回成功但缺少视频 URL');
        }
        return { videoUrl, thumbnailUrl };
      }
      if (normalizedStatus === 'failed' || normalizedStatus === 'cancelled') {
        const errMsg = remote?.error?.message ?? remote?.message ?? `任务状态: ${normalizedStatus}`;
        throw new Error(errMsg);
      }
      // 其他状态继续轮询
    }
  }

  /** 把分镜描述拼成给视频模型的 prompt（V0 纯文本驱动） */
  private buildShotPrompt(
    shot: ShotState,
    title: string,
    ratio: VideoGenerationOptions['ratio'],
    resolution: VideoGenerationOptions['resolution'],
  ): string {
    const parts: string[] = [];
    parts.push(`【主题】${title}`);
    parts.push(`【画面】${shot.description}`);
    if (shot.caption) parts.push(`【屏幕字幕】${shot.caption}`);
    parts.push(`【时长】约 ${shot.duration ?? 5} 秒`);
    parts.push(`【画幅】${ratio ?? '9:16'} | ${resolution ?? '720p'}`);
    parts.push('风格：电商带货短视频，画面干净专业，光线自然，构图聚焦商品');
    return parts.join('\n');
  }

  private statusLabel(status: string): string {
    switch (status) {
      case 'queued':
      case 'pending':
        return '排队中';
      case 'running':
      case 'processing':
        return '生成中';
      case 'succeeded':
      case 'success':
        return '生成完成';
      case 'failed':
        return '生成失败';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  }

  private async persistShots(taskId: string, shots: ShotState[]): Promise<void> {
    await this.taskRepository.update(taskId, { storyboard: shots as any });
  }

  private async fail(taskId: string, message: string): Promise<void> {
    await this.taskRepository.update(taskId, {
      status: 'failed',
      errorMessage: message,
    });
    this.creationGateway.emitError(taskId, message);
  }

  /**
   * 当未配置 ARK 时使用的演示模拟流程（保留兼容性，比赛 demo 也可作 fallback）
   */
  private async processMock(taskId: string): Promise<void> {
    const stages = [
      { progress: 10, message: '正在分析素材...' },
      { progress: 25, message: '正在生成分镜...' },
      { progress: 45, message: '正在渲染视频...' },
      { progress: 65, message: '正在添加配音...' },
      { progress: 80, message: '正在合成字幕...' },
      { progress: 95, message: '正在优化输出...' },
    ];

    for (const stage of stages) {
      await this.delay(1500);
      const task = await this.taskRepository.findOneOrFail({ where: { id: taskId } });
      task.status = 'processing';
      task.progress = stage.progress;
      await this.taskRepository.save(task);

      this.creationGateway.emitProgress(taskId, {
        progress: stage.progress,
        status: 'processing',
        message: stage.message,
      });
    }

    const task = await this.taskRepository.findOneOrFail({ where: { id: taskId } });
    task.status = 'completed';
    task.progress = 100;
    task.result = { url: '', duration: 15, mock: true } as any;
    await this.taskRepository.save(task);

    this.creationGateway.emitComplete(taskId, {
      progress: 100,
      status: 'completed',
      result: task.result,
    });
  }

  async findAll(): Promise<CreationTask[]> {
    return this.taskRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<CreationTask> {
    return this.taskRepository.findOneOrFail({ where: { id } });
  }

  /**
   * 单分镜重新生成：复用真实 ARK 流程
   */
  async regenerateShot(taskId: string, dto: RegenerateShotDto): Promise<{ ok: true }> {
    const task = await this.taskRepository.findOneOrFail({ where: { id: taskId } });
    const shots: ShotState[] = ((task.storyboard as any) ?? []).slice();
    const idx = shots.findIndex((s) => s.id === dto.shotId);
    if (idx === -1) throw new Error(`Shot ${dto.shotId} not found`);

    if (dto.description) shots[idx].description = dto.description;
    shots[idx].status = 'generating';
    shots[idx].errorMessage = undefined;
    shots[idx].videoUrl = undefined;
    await this.persistShots(taskId, shots);

    this.creationGateway.emitShotProgress(taskId, {
      shotId: shots[idx].id,
      progress: 0,
      status: 'generating',
      message: `分镜 ${shots[idx].index} 重新生成中...`,
    });

    void this.regenerateOne(taskId, idx).catch((err) => {
      this.logger.error(`[${taskId}] regenerateOne 异常: ${err?.message ?? err}`);
    });

    return { ok: true };
  }

  private async regenerateOne(taskId: string, idx: number): Promise<void> {
    const task = await this.taskRepository.findOneOrFail({ where: { id: taskId } });
    const shots: ShotState[] = ((task.storyboard as any) ?? []).slice();
    const shot = shots[idx];

    if (!this.arkConfigService.getActiveApiKey('video')) {
      // 模拟成功
      await this.delay(3000);
      shot.status = 'completed';
      shot.videoUrl = '';
      await this.persistShots(taskId, shots);
      this.creationGateway.emitShotProgress(taskId, {
        shotId: shot.id,
        progress: 100,
        status: 'completed',
        message: `分镜 ${shot.index} 已生成（模拟）`,
      });
      return;
    }

    try {
      const created = await this.arkVideoService.createTask({
        prompt: this.buildShotPrompt(shot, task.title, '9:16', '720p'),
        ratio: '9:16',
        resolution: '720p',
        duration: shot.duration,
      });
      shot.taskId = created.id;
      await this.persistShots(taskId, shots);

      const result = await this.pollUntilDone(taskId, shot, 0, 1, 0);
      shot.videoUrl = result.videoUrl;
      shot.thumbnailUrl = result.thumbnailUrl;
      shot.status = 'completed';
      await this.persistShots(taskId, shots);
      this.creationGateway.emitShotProgress(taskId, {
        shotId: shot.id,
        progress: 100,
        status: 'completed',
        message: `分镜 ${shot.index} 重新生成完成`,
      });
    } catch (err: any) {
      shot.status = 'failed';
      shot.errorMessage = err?.message ?? String(err);
      await this.persistShots(taskId, shots);
      this.creationGateway.emitShotProgress(taskId, {
        shotId: shot.id,
        progress: 0,
        status: 'failed',
        message: shot.errorMessage,
      });
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
