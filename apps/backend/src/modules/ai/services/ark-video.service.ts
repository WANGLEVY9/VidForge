import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ArkConfigService } from './ark-config.service';
import { ARK_BASE_URL, ARK_API_PATHS } from '../config/ark.config';
import {
  VideoGenerationProvider,
  VideoProviderRequest,
} from '../../../providers/provider.contracts';

export type VideoGenerationOptions = VideoProviderRequest;

@Injectable()
export class ArkVideoService implements VideoGenerationProvider {
  readonly capability = 'video' as const;
  private readonly logger = new Logger(ArkVideoService.name);

  constructor(private readonly arkConfigService: ArkConfigService) {}

  async createTask(options: VideoGenerationOptions): Promise<{ id: string }> {
    let endpointId: string;
    let apiKey: string;

    if (options.modelKey) {
      const config = this.arkConfigService.getConfig(options.modelKey);
      if (!config || config.type !== 'video') {
        throw new Error(`视频模型配置 [${options.modelKey}] 不存在`);
      }
      endpointId = config.endpointId;
      apiKey = config.apiKey;
    } else {
      const active = this.arkConfigService.getActiveApiKey('video');
      if (!active) {
        throw new Error('没有可用的视频模型配置');
      }
      endpointId = active.endpointId;
      apiKey = active.apiKey;
    }

    const content: any[] = [{ type: 'text', text: options.prompt }];

    if (options.firstFrameUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: options.firstFrameUrl },
        role: 'first_frame',
      });
    }

    const body = {
      model: endpointId,
      content,
    };

    this.logger.log(`创建视频任务: model=${endpointId}`);

    try {
      const response = await axios.post(`${ARK_BASE_URL}${ARK_API_PATHS.VIDEO_CREATE_TASK}`, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
      });

      return { id: response.data.id };
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error?.message || error?.message || '未知错误';
      this.logger.error(`视频任务创建失败: ${errorMsg}`);
      throw new Error(`视频任务创建失败: ${errorMsg}`);
    }
  }

  async queryTask(taskId: string, apiKey?: string): Promise<any> {
    if (!apiKey) {
      const active = this.arkConfigService.getActiveApiKey('video');
      if (!active) {
        throw new Error('没有可用的视频模型配置');
      }
      apiKey = active.apiKey;
    }

    try {
      const response = await axios.get(
        `${ARK_BASE_URL}${ARK_API_PATHS.VIDEO_QUERY_TASK}${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error?.message || error?.message || '未知错误';
      this.logger.error(`视频任务查询失败: ${errorMsg}`);
      throw new Error(`视频任务查询失败: ${errorMsg}`);
    }
  }
}
