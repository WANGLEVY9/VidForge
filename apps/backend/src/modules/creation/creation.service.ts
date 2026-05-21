import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { VideoTask, VideoTaskStatus } from './entities/video-task.entity';
import { CreateVideoTaskDto } from './dto/create-video-task.dto';
import { VIDEO_RENDER_QUEUE } from './config/queue.config';
import { ScriptService } from '../script/script.service';

@Injectable()
export class CreationService {
  constructor(
    @InjectRepository(VideoTask)
    private videoTaskRepository: Repository<VideoTask>,
    @InjectQueue(VIDEO_RENDER_QUEUE)
    private videoRenderQueue: Queue,
    private scriptService: ScriptService,
  ) {}

  /**
   * 创建视频生成任务
   */
  async createVideoTask(dto: CreateVideoTaskDto): Promise<VideoTask> {
    // 验证剧本是否存在
    const script = await this.scriptService.findOne(dto.scriptId);
    if (!script) {
      throw new BadRequestException('剧本不存在');
    }

    // 创建任务
    const task = this.videoTaskRepository.create({
      name: dto.name,
      scriptId: dto.scriptId,
      resolution: dto.resolution,
      aspectRatio: dto.aspectRatio,
      exportFormat: dto.exportFormat,
      status: VideoTaskStatus.PENDING,
      progress: 0,
    });

    await this.videoTaskRepository.save(task);

    // 加入任务队列
    await this.videoRenderQueue.add(
      'render-video',
      {
        taskId: task.id,
        scriptId: dto.scriptId,
        resolution: dto.resolution,
        aspectRatio: dto.aspectRatio,
      },
      {
        jobId: task.id,
      }
    );

    return this.findOne(task.id);
  }

  /**
   * 获取任务列表
   */
  async findAll(query: { page?: number; pageSize?: number; keyword?: string; status?: VideoTaskStatus }) {
    const { page = 1, pageSize = 20, keyword, status } = query;
    const qb = this.videoTaskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.script', 'script')
      .where('task.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('task.createdAt', 'DESC');

    if (keyword) {
      qb.andWhere('(task.name LIKE :keyword OR script.title LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    if (status) {
      qb.andWhere('task.status = :status', { status });
    }

    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取任务详情
   */
  async findOne(id: string): Promise<VideoTask> {
    const task = await this.videoTaskRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['script'],
    });

    if (!task) {
      throw new BadRequestException('任务不存在');
    }

    return task;
  }

  /**
   * 获取任务进度
   */
  async getTaskProgress(id: string): Promise<{ status: VideoTaskStatus; progress: number; videoUrl?: string; errorMessage?: string }> {
    const task = await this.findOne(id);
    return {
      status: task.status,
      progress: task.progress,
      videoUrl: task.videoUrl,
      errorMessage: task.errorMessage,
    };
  }

  /**
   * 删除任务
   */
  async remove(id: string) {
    const task = await this.findOne(id);
    if (!task) {
      throw new BadRequestException('任务不存在');
    }

    // 如果任务正在处理中，尝试取消
    if ([VideoTaskStatus.PENDING, VideoTaskStatus.PROCESSING].includes(task.status)) {
      try {
        await this.videoRenderQueue.remove(id);
      } catch (error) {
        console.warn('取消任务失败:', error);
      }
    }

    await this.videoTaskRepository.update(id, { isDeleted: true });
    return { success: true };
  }

  /**
   * 重试失败的任务
   */
  async retryTask(id: string) {
    const task = await this.findOne(id);
    if (!task) {
      throw new BadRequestException('任务不存在');
    }

    if (task.status !== VideoTaskStatus.FAILED) {
      throw new BadRequestException('只有失败的任务才能重试');
    }

    // 更新任务状态
    await this.videoTaskRepository.update(id, {
      status: VideoTaskStatus.PENDING,
      progress: 0,
      errorMessage: null,
    });

    // 重新加入队列
    await this.videoRenderQueue.add(
      'render-video',
      {
        taskId: task.id,
        scriptId: task.scriptId,
        resolution: task.resolution,
        aspectRatio: task.aspectRatio,
      },
      {
        jobId: task.id,
      }
    );

    return this.findOne(id);
  }
}
