import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreationTask } from './entities/creation-task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreationGateway } from './gateway/creation.gateway';

@Injectable()
export class CreationService {
  private readonly logger = new Logger(CreationService.name);

  constructor(
    @InjectRepository(CreationTask)
    private taskRepository: Repository<CreationTask>,
    private creationGateway: CreationGateway,
  ) {}

  async createTask(dto: CreateTaskDto): Promise<CreationTask> {
    const task = this.taskRepository.create({
      title: dto.title,
      storyboard: dto.storyboard || [],
      status: 'pending',
      progress: 0,
    });
    const saved = await this.taskRepository.save(task);

    this.processTask(saved.id);

    return saved;
  }

  private async processTask(taskId: string) {
    const stages = [
      { progress: 10, message: '正在分析素材...' },
      { progress: 25, message: '正在生成分镜...' },
      { progress: 45, message: '正在渲染视频...' },
      { progress: 65, message: '正在添加配音...' },
      { progress: 80, message: '正在合成字幕...' },
      { progress: 95, message: '正在优化输出...' },
    ];

    for (const stage of stages) {
      await this.delay(2000);
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
    task.result = { url: '#', duration: 30 };
    await this.taskRepository.save(task);

    this.creationGateway.emitComplete(taskId, {
      progress: 100,
      status: 'completed',
      result: { url: '#', duration: 30 },
    });
  }

  async findAll(): Promise<CreationTask[]> {
    return this.taskRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<CreationTask> {
    return this.taskRepository.findOneOrFail({ where: { id } });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
