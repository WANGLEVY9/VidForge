import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ArkConfigService } from './ark-config.service';
import { ARK_BASE_URL, ARK_API_PATHS } from '../config/ark.config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  modelKey?: string;
}

@Injectable()
export class ArkTextService {
  private readonly logger = new Logger(ArkTextService.name);

  constructor(private readonly arkConfigService: ArkConfigService) {}

  async chatCompletion(options: ChatCompletionOptions): Promise<any> {
    let endpointId: string;
    let apiKey: string;

    if (options.modelKey) {
      const config = this.arkConfigService.getConfig(options.modelKey);
      if (!config || config.type !== 'text') {
        throw new Error(`文本模型配置 [${options.modelKey}] 不存在`);
      }
      endpointId = config.endpointId;
      apiKey = config.apiKey;
    } else {
      const active = this.arkConfigService.getActiveApiKey('text');
      if (!active) {
        throw new Error('没有可用的文本模型配置');
      }
      endpointId = active.endpointId;
      apiKey = active.apiKey;
    }

    const body: Record<string, unknown> = {
      model: endpointId,
      messages: options.messages,
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }

    this.logger.debug(`发送文本请求: model=${endpointId}`);

    try {
      const response = await axios.post(
        `${ARK_BASE_URL}${ARK_API_PATHS.CHAT_COMPLETIONS}`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          // ARK Doubao-Seed 在长上下文/复杂任务时偶发 30-90s
          // 这里给到 120s，前端会用 150s 包住，保证不会前端先超时
          timeout: 120000,
        },
      );

      return response.data;
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.error?.message || error?.message || '未知错误';
      const status = error?.response?.status;
      const code = error?.code;
      this.logger.error(
        `文本模型调用失败 status=${status ?? '-'} code=${code ?? '-'}: ${errorMsg}`,
      );
      throw new Error(`文本模型调用失败: ${errorMsg}`);
    }
  }
}
