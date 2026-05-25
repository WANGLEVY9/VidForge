import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportTask } from './entities/export-task.entity';
import { CreateExportDto } from './dto/create-export.dto';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectRepository(ExportTask)
    private exportRepo: Repository<ExportTask>,
  ) {}

  async create(userId: string, dto: CreateExportDto): Promise<ExportTask> {
    const task = this.exportRepo.create({
      userId,
      creationTaskId: dto.creationTaskId,
      format: dto.format as any,
      resolution: dto.resolution as any,
      status: 'pending',
      progress: 0,
      options: {
        embedSubtitles: dto.embedSubtitles ?? true,
        keepIndividualShots: dto.keepIndividualShots ?? false,
        generateThumbnail: dto.generateThumbnail ?? true,
      },
    });
    const saved = await this.exportRepo.save(task);
    this.processExport(saved.id);
    return saved;
  }

  private async processExport(taskId: string) {
    await this.delay(1000);
    const task = await this.exportRepo.findOneOrFail({ where: { id: taskId } });
    task.status = 'processing';
    await this.exportRepo.save(task);

    const stages = [
      { progress: 20, message: '正在编码视频流...' },
      { progress: 40, message: '正在编码音频流...' },
      { progress: 60, message: '正在合成字幕...' },
      { progress: 80, message: '正在优化输出...' },
    ];

    for (const stage of stages) {
      await this.delay(2000);
      task.progress = stage.progress;
      await this.exportRepo.save(task);
    }

    task.status = 'completed';
    task.progress = 100;
    task.outputUrl = '#';
    task.fileSize = Math.floor(Math.random() * 100) + 30;
    await this.exportRepo.save(task);
  }

  async findAll(userId: string): Promise<ExportTask[]> {
    return this.exportRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' as any },
      take: 20,
    });
  }

  async findOne(userId: string, id: string): Promise<ExportTask> {
    const task = await this.exportRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('导出任务不存在');
    if (task.userId && task.userId !== userId) throw new ForbiddenException('无权访问该导出任务');
    return task;
  }

  async cancel(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.exportRepo.update(id, { status: 'failed', errorMessage: '用户取消' });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
