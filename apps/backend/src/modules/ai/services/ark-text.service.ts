import { Injectable, Logger, Optional } from '@nestjs/common';
import axios from 'axios';
import { ArkConfigService } from './ark-config.service';
import { ArkResponseCacheService } from './ark-response-cache.service';
import { ARK_BASE_URL, ARK_API_PATHS } from '../config/ark.config';
import { TraceService } from '../../trace/trace.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<any>;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  modelKey?: string;
  /** 用于 trace 关联 */
  traceTaskId?: string;
  traceScope?: 'creation' | 'agent' | 'export' | 'material' | 'script';
  traceSpan?: string;
  traceUserId?: string;
}

@Injectable()
export class ArkTextService {
  private readonly logger = new Logger(ArkTextService.name);

  constructor(
    private readonly arkConfigService: ArkConfigService,
    private readonly cache: ArkResponseCacheService,
    @Optional() private readonly traceService?: TraceService,
  ) {}

  async chatCompletion(options: ChatCompletionOptions): Promise<any> {
    let endpointId: string;
    let apiKey: string;
    let modelName: string;

    if (options.modelKey) {
      const config = this.arkConfigService.getConfig(options.modelKey);
      if (!config || config.type !== 'text') {
        throw new Error(`文本模型配置 [${options.modelKey}] 不存在`);
      }
      endpointId = config.endpointId;
      apiKey = config.apiKey;
      modelName = config.name;
    } else {
      const active = this.arkConfigService.getActiveApiKey('text');
      if (!active) {
        throw new Error('没有可用的文本模型配置');
      }
      endpointId = active.endpointId;
      apiKey = active.apiKey;
      const cfg = this.arkConfigService.getConfig(active.key);
      modelName = cfg?.name ?? 'unknown';
    }

    const cacheInput = {
      model: endpointId,
      messages: options.messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };

    // ── 应用级缓存命中:直接返回,不调 ARK ──
    const cached = this.cache.get(cacheInput);
    if (cached) {
      this.logger.debug(`[cache HIT] ${endpointId} - skipped ARK call`);
      if (this.traceService && options.traceTaskId) {
        const cachedUsage = cached?.usage ?? {};
        void this.traceService.recordSpan({
          userId: options.traceUserId,
          taskId: options.traceTaskId,
          scope: options.traceScope ?? 'agent',
          span: options.traceSpan ?? 'ark.text',
          startedAt: new Date(),
          endedAt: new Date(),
          status: 'ok',
          model: modelName,
          promptTokens: 0, // 缓存命中,实际未消耗
          completionTokens: 0,
          cacheHit: true,
          summary: `local-cache HIT (saved ~${(cachedUsage.prompt_tokens ?? 0) + (cachedUsage.completion_tokens ?? 0)} tokens)`,
        });
      }
      return cached;
    }

    const body: Record<string, unknown> = {
      model: endpointId,
      messages: options.messages,
    };
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;

    const startedAt = new Date();
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
          timeout: 120000,
        },
      );

      const data = response.data;
      const usage = data?.usage ?? {};
      const promptTokens = Number(usage.prompt_tokens ?? 0);
      const completionTokens = Number(usage.completion_tokens ?? 0);
      // 火山方舟若启用了 prompt cache,会在 usage 中返回 prompt_tokens_details.cached_tokens
      const cachedTokens = Number(usage?.prompt_tokens_details?.cached_tokens ?? 0);
      const cacheHit = cachedTokens > 0;

      // 写入应用级缓存
      this.cache.set(cacheInput, data, promptTokens + completionTokens);

      // 异步写 trace,不阻塞调用方
      if (this.traceService && options.traceTaskId) {
        void this.traceService.recordSpan({
          userId: options.traceUserId,
          taskId: options.traceTaskId,
          scope: options.traceScope ?? 'agent',
          span: options.traceSpan ?? 'ark.text',
          startedAt,
          endedAt: new Date(),
          status: 'ok',
          model: modelName,
          promptTokens,
          completionTokens,
          cacheHit,
          summary: `chat tokens=${promptTokens}+${completionTokens}${cacheHit ? ' (volc cache hit)' : ''}`,
        });
      }

      return data;
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.error?.message || error?.message || '未知错误';
      const status = error?.response?.status;
      const code = error?.code;
      this.logger.error(
        `文本模型调用失败 status=${status ?? '-'} code=${code ?? '-'}: ${errorMsg}`,
      );
      if (this.traceService && options.traceTaskId) {
        void this.traceService.recordSpan({
          userId: options.traceUserId,
          taskId: options.traceTaskId,
          scope: options.traceScope ?? 'agent',
          span: options.traceSpan ?? 'ark.text',
          startedAt,
          endedAt: new Date(),
          status: 'error',
          model: modelName,
          errorMessage: errorMsg,
        });
      }
      throw new Error(`文本模型调用失败: ${errorMsg}`);
    }
  }
}
