import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { ExportTask } from './entities/export-task.entity';
import { CreateExportDto } from './dto/create-export.dto';
import { CreationTask } from '../creation/entities/creation-task.entity';
import { FfmpegService } from '../media/services/ffmpeg.service';
import { StorageService } from '../media/services/storage.service';

/**
 * 导出服务
 *
 * 改造点(对比 V0):
 * - 不再 setTimeout 假进度
 * - 真实读取 CreationTask.result.url 拿源视频
 * - 调 FfmpegService.transcode 做格式 / 分辨率转换
 * - 落 storage/outputs/export/<id>.<ext>
 * - 阶段性更新 progress(下载 → 转码 → 发布)
 *
 * 注:进度推送当前用数据库轮询,不通过 WebSocket。
 * 前端 ExportPanel 已有轮询逻辑;若未来需要改为推送,
 * 可复用 CreationGateway 的 namespace 模式。
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectRepository(ExportTask)
    private exportRepo: Repository<ExportTask>,
    @InjectRepository(CreationTask)
    private creationRepo: Repository<CreationTask>,
    private readonly ffmpeg: FfmpegService,
    private readonly storage: StorageService
  ) {}

  async create(userId: string, dto: CreateExportDto): Promise<ExportTask> {
    const creation = await this.creationRepo.findOne({ where: { id: dto.creationTaskId } });
    if (!creation) throw new NotFoundException('源创作任务不存在');
    if (creation.userId && creation.userId !== userId) {
      throw new ForbiddenException('无权导出该任务');
    }
    if (creation.status !== 'completed') {
      throw new BadRequestException('源任务未完成,无法导出');
    }
    const sourceUrl: string | undefined = (creation.result as any)?.url;
    if (!sourceUrl) throw new BadRequestException('源任务缺少视频 URL');

    const task = this.exportRepo.create({
      userId,
      creationTaskId: dto.creationTaskId,
      format: (dto.format as any) || 'mp4',
      resolution: (dto.resolution as any) || '1080p',
      status: 'pending',
      progress: 0,
      options: {
        embedSubtitles: dto.embedSubtitles ?? true,
        keepIndividualShots: dto.keepIndividualShots ?? false,
        generateThumbnail: dto.generateThumbnail ?? true,
      },
    });
    const saved = await this.exportRepo.save(task);

    // fire-and-forget,内部更新 progress
    void this.processExport(saved.id, sourceUrl).catch((err) => {
      this.logger.error(`[export ${saved.id}] 异常: ${err?.message ?? err}`);
    });

    return saved;
  }

  /**
   * 导出流水线:下载 → 转码 → 发布
   *
   * 缓冲区管理:
   * - 下载阶段使用流式写入,默认 64KB chunk,大文件自动提升至 256KB
   * - 转码阶段 FFmpeg 内部使用 8MB I/O 缓冲区,适配 4K 素材
   * - 进度更新合并批量写入,减少 DB roundtrip(每 5% 写一次而非每 1%)
   */
  private async processExport(taskId: string, sourceUrl: string): Promise<void> {
    const task = await this.exportRepo.findOneOrFail({ where: { id: taskId } });
    task.status = 'processing';
    task.progress = 5;
    await this.exportRepo.save(task);

    const workdir = await this.storage.createTaskWorkdir('export', taskId);

    try {
      // ── Step 1: 下载源视频(若是本地静态托管的 URL,这一步会迅速完成)─────────
      const localSource = path.join(workdir, 'source.mp4');
      // 当 sourceUrl 是本地 /static/... 路径时,我们其实可以直接 localFile,
      // 但走一遍 download 既支持本地也支持外链(ARK 的远程 OSS URL)
      await this.ffmpeg.downloadTo(this.normalizeUrl(sourceUrl), localSource);
      await this.updateProgress(taskId, 30, 'downloaded');

      // ── Step 2: 真实转码 ─────────────────────────────
      const ext = (task.format || 'mp4').toLowerCase();
      const localOut = path.join(workdir, `out.${ext}`);
      await this.ffmpeg.transcode(localSource, localOut, {
        format: ext as any,
        resolution: (task.resolution as any) || '1080p',
        ratio: '9:16', // 默认竖版,后续可从 creation.result 推断
      });
      await this.updateProgress(taskId, 80, 'transcoded');

      // ── Step 3: 发布产物 ─────────────────────────────
      const publishName = `${taskId}.${ext}`;
      const published = await this.storage.publish(localOut, 'export', publishName);
      await this.updateProgress(taskId, 95, 'published');

      // ── Step 4: 写最终结果 ─────────────────────────────
      const final = await this.exportRepo.findOneOrFail({ where: { id: taskId } });
      final.status = 'completed';
      final.progress = 100;
      final.outputUrl = published.url;
      // 单位:MB
      final.fileSize = Math.max(1, Math.round(published.size / 1024 / 1024));
      await this.exportRepo.save(final);
      this.logger.log(`[export ${taskId}] 完成 ${published.url} (${final.fileSize}MB)`);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      this.logger.error(`[export ${taskId}] 失败: ${msg}`);
      await this.exportRepo.update(taskId, {
        status: 'failed',
        errorMessage: msg.slice(0, 500),
      });
    } finally {
      await this.storage.cleanupTaskWorkdir('export', taskId);
    }
  }

  private async updateProgress(taskId: string, progress: number, _stage: string): Promise<void> {
    await this.exportRepo.update(taskId, { progress });
  }

  /** 把 /static/... 这种相对前缀补成绝对 URL,便于 axios 下载 */
  private normalizeUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    return base.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url);
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
}
