import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * 文件存储服务
 *
 * - 短期方案:落本地 storage/ 目录,通过静态文件托管对外提供 URL
 * - 长期方案:实现 putObject 时检测 OSS_* 配置,有配置则上传到对象存储
 *
 * 这一层的核心价值是把"产物 URL"与"具体存储后端"解耦,
 * 业务侧只关心 URL,不关心是落本地还是 OSS。
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageRoot: string;
  private readonly tmpRoot: string;
  private readonly outputsRoot: string;
  private readonly publicBaseUrl: string;

  constructor() {
    // backend 进程的 process.cwd() 在 dev/start:dev 都是 apps/backend
    this.storageRoot = path.resolve(process.cwd(), 'storage');
    this.tmpRoot = path.join(this.storageRoot, 'tmp');
    this.outputsRoot = path.join(this.storageRoot, 'outputs');
    // 统一通过 /static 路径暴露
    const apiBase = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    this.publicBaseUrl = `${apiBase.replace(/\/$/, '')}/static`;
  }

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.tmpRoot, { recursive: true });
    await fs.mkdir(this.outputsRoot, { recursive: true });
    this.logger.log(`存储根目录: ${this.storageRoot}`);
    this.logger.log(`产物公网 URL 前缀: ${this.publicBaseUrl}`);
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
  async publish(localPath: string, targetSubdir: string, targetName: string): Promise<{
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
