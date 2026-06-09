import { Injectable, Logger } from '@nestjs/common';

interface OSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint: string;
}

/**
 * 阿里云 OSS 对象存储服务
 *
 * 封装 ali-oss SDK，提供文件上传、删除、公开 URL 生成等能力。
 * 仅当 OSS_* 环境变量全部配置时激活，否则所有方法静默返回 fallback。
 */
@Injectable()
export class OssService {
  private readonly logger = new Logger(OssService.name);
  private client: any | null = null;
  private bucket = '';
  public enabled = false;

  constructor() {
    const config = this.loadConfig();
    if (config) {
      this.bucket = config.bucket;
      this.initClient(config);
    }
  }

  private loadConfig(): OSSConfig | null {
    const region = process.env.OSS_REGION?.trim();
    // 兼容新旧两种变量名（OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY）
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID?.trim() || process.env.OSS_ACCESS_KEY?.trim();
    const accessKeySecret =
      process.env.OSS_ACCESS_KEY_SECRET?.trim() || process.env.OSS_SECRET_KEY?.trim();
    const bucket = process.env.OSS_BUCKET?.trim();
    const endpoint = process.env.OSS_ENDPOINT?.trim();

    if (!region || !accessKeyId || !accessKeySecret || !bucket) {
      this.logger.log(
        'OSS 未配置（缺少 OSS_REGION / ACCESS_KEY_ID / ACCESS_KEY_SECRET / BUCKET），将使用本地存储'
      );
      return null;
    }

    return {
      region,
      accessKeyId,
      accessKeySecret,
      bucket,
      endpoint: endpoint || `${region}.aliyuncs.com`,
    };
  }

  private initClient(config: OSSConfig): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const OSS = require('ali-oss');
      this.client = new OSS({
        region: config.region,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        bucket: config.bucket,
        endpoint: config.endpoint,
        secure: true,
      });
      this.enabled = true;
      this.logger.log(`OSS 已激活: bucket=${config.bucket}, region=${config.region}`);
    } catch (err: any) {
      this.logger.error(`OSS 初始化失败: ${err?.message ?? err}，将使用本地存储`);
      this.client = null;
    }
  }

  /**
   * 上传文件到 OSS
   * @param localPath 本地文件绝对路径
   * @param ossKey OSS 对象 key（如 uploads/xxx.jpg）
   * @param mimeType 文件 MIME 类型
   * @returns OSS 公开访问 URL，或 null（上传失败时）
   */
  async upload(localPath: string, ossKey: string, mimeType?: string): Promise<string | null> {
    if (!this.client || !this.enabled) return null;

    try {
      const options: any = {};
      if (mimeType) options.mime = mimeType;

      const result = await this.client.put(ossKey, localPath, options);
      this.logger.log(`OSS 上传成功: ${ossKey} (${result.res?.status})`);
      return this.getUrl(ossKey);
    } catch (err: any) {
      this.logger.error(`OSS 上传失败: ${ossKey} - ${err?.message ?? err}`);
      return null;
    }
  }

  /**
   * 从 OSS 删除文件
   */
  async delete(ossKey: string): Promise<boolean> {
    if (!this.client || !this.enabled) return false;

    try {
      await this.client.delete(ossKey);
      this.logger.log(`OSS 删除成功: ${ossKey}`);
      return true;
    } catch (err: any) {
      this.logger.error(`OSS 删除失败: ${ossKey} - ${err?.message ?? err}`);
      return false;
    }
  }

  /**
   * 获取 OSS 对象的公开访问 URL
   */
  getUrl(ossKey: string): string {
    return `https://${this.bucket}.${this.getEndpointHost()}/${ossKey}`;
  }

  private getEndpointHost(): string {
    const ep = process.env.OSS_ENDPOINT?.trim() || '';
    if (ep) return ep.replace(/^https?:\/\//, '');
    const region = process.env.OSS_REGION?.trim() || 'oss-cn-beijing';
    return `${region}.aliyuncs.com`;
  }
}
