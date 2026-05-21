import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OSS from 'ali-oss';
import { generateFileName } from '@vidforge/common';

@Injectable()
export class OssService {
  private client: OSS;

  constructor(private configService: ConfigService) {
    this.client = new OSS({
      accessKeyId: this.configService.get('OSS_ACCESS_KEY'),
      accessKeySecret: this.configService.get('OSS_SECRET_KEY'),
      bucket: this.configService.get('OSS_BUCKET'),
      endpoint: this.configService.get('OSS_ENDPOINT'),
      region: this.configService.get('VOLC_ENGINE_REGION'),
    });
  }

  /**
   * 上传文件到OSS
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'material'): Promise<{ url: string; fileName: string }> {
    const fileName = `${folder}/${generateFileName(file.originalname)}`;
    
    try {
      const result = await this.client.put(fileName, file.buffer);
      return {
        url: result.url,
        fileName,
      };
    } catch (error) {
      throw new Error(`文件上传失败: ${error.message}`);
    }
  }

  /**
   * 删除OSS文件
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.client.delete(fileName);
    } catch (error) {
      throw new Error(`文件删除失败: ${error.message}`);
    }
  }

  /**
   * 获取文件临时访问地址
   */
  async getFileUrl(fileName: string, expires: number = 3600): Promise<string> {
    return this.client.signatureUrl(fileName, { expires });
  }
}
