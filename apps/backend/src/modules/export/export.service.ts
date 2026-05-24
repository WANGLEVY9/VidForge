import { Injectable, Logger } from '@nestjs/common';
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

  async create(dto: CreateExportDto): Promise<ExportTask> {
    const task = this.exportRepo.create({
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

  async findAll(): Promise<ExportTask[]> {
    return this.exportRepo.find({ order: { createdAt: 'DESC' as any }, take: 20 });
  }

  async findOne(id: string): Promise<ExportTask> {
    return this.exportRepo.findOneOrFail({ where: { id } });
  }

  async cancel(id: string): Promise<void> {
    await this.exportRepo.update(id, { status: 'failed', errorMessage: '用户取消' });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
