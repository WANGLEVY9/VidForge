import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { OssService } from './oss.service';

/**
 * 文件存储服务
 *
 * 统一存储抽象层：
 * - 上传文件优先走 OSS（若 OssService 已激活）
 * - 否则落本地 storage/ 目录，通过 Express 静态文件托管对外提供 URL
 *
 * 业务侧只关心 URL，不关心是落本地还是 OSS。
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageRoot: string;
  private readonly tmpRoot: string;
  private readonly uploadsRoot: string;
  private readonly outputsRoot: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly ossService: OssService) {
    // backend 进程的 process.cwd() 在 dev/start:dev 都是 apps/backend
    this.storageRoot = path.resolve(process.cwd(), 'storage');
    this.tmpRoot = path.join(this.storageRoot, 'tmp');
    this.uploadsRoot = path.join(this.storageRoot, 'uploads');
    this.outputsRoot = path.join(this.storageRoot, 'outputs');
    // 统一通过 /static 路径暴露。
    // 公网前缀推导优先级:
    //   1) API_BASE_URL            显式配置(最高优先)
    //   2) RAILWAY_PUBLIC_DOMAIN   Railway 部署时自动注入的公网域名(裸域名,无协议)
    //   3) http://localhost:PORT   本地兜底
    // 关键:绝不能在生产环境把 localhost 写进产物 URL,否则前端(异源)拿到的
    //       合成视频地址不可达,导致「完成后无法查看/下载合成视频」。
    this.publicBaseUrl = `${StorageService.resolveApiBase().replace(/\/$/, '')}/static`;
  }

  /**
   * 推导对外可访问的 API 基础地址(裸 origin,无尾斜杠)。
   * 优先 API_BASE_URL → Railway 注入的 RAILWAY_PUBLIC_DOMAIN → 本地兜底。
   */
  private static resolveApiBase(): string {
    const explicit = process.env.API_BASE_URL?.trim();
    if (explicit) return explicit;
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
    if (railwayDomain) {
      return /^https?:\/\//i.test(railwayDomain) ? railwayDomain : `https://${railwayDomain}`;
    }
    return `http://localhost:${process.env.PORT || 3001}`;
  }

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.uploadsRoot, { recursive: true });
    await fs.mkdir(this.tmpRoot, { recursive: true });
    await fs.mkdir(this.outputsRoot, { recursive: true });
    this.logger.log(`存储根目录: ${this.storageRoot}`);
    this.logger.log(`上传目录: ${this.uploadsRoot}`);
    this.logger.log(`产物公网 URL 前缀: ${this.publicBaseUrl}`);
    this.logger.log(`存储模式: ${this.ossService.enabled ? '阿里云 OSS' : '本地磁盘'}`);
    // 生产环境若仍指向 localhost,前端将无法访问合成产物,显式告警提示运维补 env
    if (
      process.env.NODE_ENV === 'production' &&
      /localhost|127\.0\.0\.1/.test(this.publicBaseUrl)
    ) {
      this.logger.warn(
        '产物公网 URL 前缀指向 localhost!请在部署平台配置 API_BASE_URL=后端公网地址(如 https://xxx.up.railway.app),否则前端无法播放/下载合成视频。'
      );
    }
  }

  /**
   * 存储上传的文件
   *
   * - OSS 模式：上传到阿里云 OSS，返回 OSS 公开 URL
   * - 本地模式：文件已在 storage/uploads/ 中，返回 /static/uploads/xxx 相对路径
   *
   * @param localPath 本地文件绝对路径（multer 写入的位置）
   * @param filename  文件名（如 uuid.ext）
   * @param mimeType  文件 MIME 类型
   * @returns 可公开访问的文件 URL
   */
  async storeUpload(localPath: string, filename: string, mimeType?: string): Promise<string> {
    if (this.ossService.enabled) {
      const ossKey = `uploads/${filename}`;
      const ossUrl = await this.ossService.upload(localPath, ossKey, mimeType);
      // 无论 OSS 上传成功还是失败，都清理本地临时文件
      await fs.unlink(localPath).catch(() => {});
      if (ossUrl) return ossUrl;
      this.logger.warn('OSS 上传失败，回退到本地存储');
    }

    // 本地模式：将临时文件移动到 storage/uploads/
    const destPath = path.join(this.uploadsRoot, filename);
    try {
      await fs.rename(localPath, destPath);
    } catch (err: any) {
      if (err?.code === 'EXDEV') {
        await fs.copyFile(localPath, destPath);
        await fs.unlink(localPath);
      } else {
        throw err;
      }
    }
    return `/static/uploads/${filename}`;
  }

  /**
   * 获取文件的完整公开 URL
   * 处理相对路径（/static/...）和绝对路径（http/https）两种格式
   */
  resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // 相对路径：补全公网前缀
    return `${this.publicBaseUrl}${url.replace(/^\/static/, '')}`;
  }

  /**
   * 删除文件（OSS 或本地）
   */
  async delete(url: string): Promise<void> {
    if (this.ossService.enabled) {
      // 从 URL 中提取 OSS key
      const ossKey = url.replace(/^https?:\/\/[^/]+\//, '');
      await this.ossService.delete(ossKey);
    }
    // 本地删除：由 MaterialService.remove 处理
  }

  /** 给某个任务分配一个临时工作目录 */
  async createTaskWorkdir(scope: string, taskId: string): Promise<string> {
    const dir = path.join(this.tmpRoot, scope, taskId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  /** 清理任务工作目录(成功 / 失败后均可调用) */
  async cleanupTaskWorkdir(scope: string, taskId: string): Promise<void> {
    const dir = path.join(this.tmpRoot, scope, taskId);
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (err: any) {
      this.logger.warn(`清理工作目录失败: ${dir} - ${err?.message ?? err}`);
    }
  }

  /**
   * 将本地文件移动到 outputs 目录,并返回可对外访问的 URL
   * @param localPath 本地文件绝对路径
   * @param targetSubdir 例如 'creation' / 'export'
   * @param targetName 目标文件名(包含扩展名)
   */
  async publish(
    localPath: string,
    targetSubdir: string,
    targetName: string
  ): Promise<{
    url: string;
    absPath: string;
    size: number;
  }> {
    const targetDir = path.join(this.outputsRoot, targetSubdir);
    await fs.mkdir(targetDir, { recursive: true });
    const absPath = path.join(targetDir, targetName);

    // 先尝试 rename,跨设备时回落到 copy + unlink
    try {
      await fs.rename(localPath, absPath);
    } catch (err: any) {
      if (err?.code === 'EXDEV') {
        await fs.copyFile(localPath, absPath);
        await fs.unlink(localPath);
      } else {
        throw err;
      }
    }
    const stat = await fs.stat(absPath);
    const url = `${this.publicBaseUrl}/outputs/${targetSubdir}/${encodeURIComponent(targetName)}`;
    return { url, absPath, size: stat.size };
  }

  /** 读 BGM 资源目录(用于风格匹配) */
  getBgmRoot(): string {
    return path.join(this.storageRoot, 'bgm');
  }

  getStorageRoot(): string {
    return this.storageRoot;
  }
}
