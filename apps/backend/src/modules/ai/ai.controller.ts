import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArkConfigService } from './services/ark-config.service';
import { ArkTextService } from './services/ark-text.service';
import { ArkVideoService } from './services/ark-video.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('AI能力')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly arkConfigService: ArkConfigService,
    private readonly arkTextService: ArkTextService,
    private readonly arkVideoService: ArkVideoService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'ai' };
  }

  @Get('ark/configs')
  @ApiOperation({ summary: '查看所有火山方舟模型配置' })
  getAllConfigs() {
    // 出于安全, 不回传 apiKey 全文, 仅回传脱敏前后 4 位
    return this.arkConfigService.getAllConfigs().map((c) => ({
      ...c,
      apiKey: c.apiKey
        ? `${c.apiKey.slice(0, 4)}...${c.apiKey.slice(-4)}`
        : '',
    }));
  }

  @Get('ark/diagnose')
  @ApiOperation({
    summary: 'ARK 文本模型自检',
    description:
      '一键诊断: 是否配置了文本模型 + 实际能否调通 (发送一条最小 ping 请求)',
  })
  async diagnose() {
    const active = this.arkConfigService.getActiveApiKey('text');
    if (!active) {
      return {
        ok: false,
        stage: 'config',
        reason:
          '未配置 ARK 文本模型环境变量 ARK_TEXT_PRIMARY_ENDPOINT_ID / ARK_TEXT_PRIMARY_API_KEY',
      };
    }

    const startedAt = Date.now();
    try {
      const resp = await this.arkTextService.chatCompletion({
        messages: [
          { role: 'system', content: '你是一个测试机器人, 只输出 pong' },
          { role: 'user', content: 'ping' },
        ],
        temperature: 0,
        maxTokens: 8,
      });
      const content =
        resp?.choices?.[0]?.message?.content ?? '(empty)';
      return {
        ok: true,
        stage: 'call',
        endpointId: active.endpointId,
        durationMs: Date.now() - startedAt,
        sample: String(content).slice(0, 64),
      };
    } catch (error: any) {
      return {
        ok: false,
        stage: 'call',
        endpointId: active.endpointId,
        durationMs: Date.now() - startedAt,
        reason: error?.message ?? String(error),
      };
    }
  }

  @Post('ark/chat')
  @ApiOperation({ summary: '文本对话' })
  async chatCompletion(@Body() dto: { messages: Array<{ role: string; content: string }>; modelKey?: string }) {
    return this.arkTextService.chatCompletion({
      messages: dto.messages as any,
      modelKey: dto.modelKey,
    });
  }

  @Post('ark/video/generate')
  @ApiOperation({ summary: '创建视频生成任务' })
  async createVideoTask(@Body() dto: { prompt: string; modelKey?: string }) {
    return this.arkVideoService.createTask({
      prompt: dto.prompt,
      modelKey: dto.modelKey,
    });
  }

  @Get('ark/video/task/:taskId')
  @ApiOperation({ summary: '查询视频生成任务状态' })
  async queryVideoTask(@Param('taskId') taskId: string) {
    return this.arkVideoService.queryTask(taskId);
  }
}
