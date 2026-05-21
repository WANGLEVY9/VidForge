import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { VIDEO_RENDER_QUEUE } from '../config/queue.config';
import { VideoTask, VideoTaskStatus } from '../entities/video-task.entity';
import { VideoRenderService } from '../services/video-render.service';

interface VideoRenderJobData {
  taskId: string;
  scriptId: string;
  resolution: string;
  aspectRatio: string;
}

@Processor(VIDEO_RENDER_QUEUE)
export class VideoRenderProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoRenderProcessor.name);

  constructor(
    @InjectRepository(VideoTask)
    private videoTaskRepository: Repository<VideoTask>,
    private videoRenderService: VideoRenderService,
  ) {
    super();
  }

  async process(job: Job<VideoRenderJobData>) {
    const { taskId, scriptId, resolution, aspectRatio } = job.data;
    this.logger.log(`开始处理视频任务: ${taskId}, 剧本ID: ${scriptId}`);

    try {
      // 更新任务状态为处理中
      await this.updateTaskStatus(taskId, VideoTaskStatus.PROCESSING, 10);

      // 获取任务的导出格式
      const task = await this.videoTaskRepository.findOneBy({ id: taskId });
      
      // 执行视频渲染
      const result = await this.videoRenderService.renderVideo(
        {
          scriptId,
          resolution,
          aspectRatio,
          exportFormat: task?.exportFormat || 'mp4',
        },
        (progress) => {
          // 更新任务进度
          this.updateTaskProgress(taskId, progress);
          job.updateProgress(progress);
        }
      );

      // 渲染完成，更新任务状态
      await this.videoTaskRepository.update(taskId, {
        status: VideoTaskStatus.SUCCESS,
        progress: 100,
        videoUrl: result.videoUrl,
        duration: result.duration,
        videoSize: result.size,
      });

      this.logger.log(`视频任务处理完成: ${taskId}, 视频地址: ${result.videoUrl}`);
      return result;
    } catch (error) {
      this.logger.error(`视频任务处理失败: ${taskId}, 错误: ${error.message}`);
      // 更新任务状态为失败
      await this.videoTaskRepository.update(taskId, {
        status: VideoTaskStatus.FAILED,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  private async updateTaskStatus(taskId: string, status: VideoTaskStatus, progress?: number) {
    const updateData: any = { status };
    if (progress !== undefined) {
      updateData.progress = progress;
    }
    await this.videoTaskRepository.update(taskId, updateData);
  }

  private async updateTaskProgress(taskId: string, progress: number) {
    await this.videoTaskRepository.update(taskId, { progress });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`任务失败: ${job.id}, 错误: ${error.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`任务完成: ${job.id}`);
  }
}
