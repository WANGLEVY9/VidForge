import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArkConfigService } from './services/ark-config.service';
import { ArkTextService } from './services/ark-text.service';
import { ArkVideoService } from './services/ark-video.service';

@ApiTags('AI能力')
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
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ark/configs')
  @ApiOperation({ summary: '查看所有火山方舟模型配置' })
  @ApiBearerAuth()
  getAllConfigs() {
    return this.arkConfigService.getAllConfigs();
  }

  @Post('ark/chat')
  @ApiOperation({ summary: '文本对话' })
  @ApiBearerAuth()
  async chatCompletion(@Body() dto: { messages: Array<{ role: string; content: string }>; modelKey?: string }) {
    return this.arkTextService.chatCompletion({
      messages: dto.messages as any,
      modelKey: dto.modelKey,
    });
  }

  @Post('ark/video/generate')
  @ApiOperation({ summary: '创建视频生成任务' })
  @ApiBearerAuth()
  async createVideoTask(@Body() dto: { prompt: string; modelKey?: string }) {
    return this.arkVideoService.createTask({
      prompt: dto.prompt,
      modelKey: dto.modelKey,
    });
  }

  @Get('ark/video/task/:taskId')
  @ApiOperation({ summary: '查询视频生成任务状态' })
  @ApiBearerAuth()
  async queryVideoTask(@Param('taskId') taskId: string) {
    return this.arkVideoService.queryTask(taskId);
  }
}
