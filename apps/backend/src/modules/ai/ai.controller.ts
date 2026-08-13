import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArkConfigService } from './services/ark-config.service';
import { ArkTextService } from './services/ark-text.service';
import { ArkVideoService } from './services/ark-video.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * 给一个字符串生成 "指纹" 信息, 用于排查环境变量是否被黏贴时污染
 * 不暴露原文, 只暴露长度 / 前后 4 位 / 是否含异常字符
 */
function fingerprint(raw: string | undefined | null) {
  if (!raw) {
    return { length: 0, masked: '', issues: ['empty'] };
  }
  const issues: string[] = [];
  if (raw !== raw.trim()) issues.push('has-leading-or-trailing-whitespace');
  if (/\s/.test(raw)) issues.push('contains-whitespace');
  if (/[\r\n]/.test(raw)) issues.push('contains-newline');
  if (/["'“”‘’`]/.test(raw)) issues.push('contains-quote');
  if (/[\u3000-\u303F\uFF00-\uFFEF]/.test(raw))
    issues.push('contains-fullwidth-or-cjk-punctuation');
  return {
    length: raw.length,
    masked: raw.length <= 8 ? '*'.repeat(raw.length) : `${raw.slice(0, 4)}...${raw.slice(-4)}`,
    issues,
  };
}

@ApiTags('AI能力')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly arkConfigService: ArkConfigService,
    private readonly arkTextService: ArkTextService,
    private readonly arkVideoService: ArkVideoService
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
      apiKey: c.apiKey ? `${c.apiKey.slice(0, 4)}...${c.apiKey.slice(-4)}` : '',
      apiKeyFingerprint: fingerprint(c.apiKey),
      endpointFingerprint: fingerprint(c.endpointId),
    }));
  }

  @Get('ark/diagnose')
  @ApiOperation({
    summary: 'ARK 文本模型自检',
    description: '一键诊断: 是否配置了文本模型 + 实际能否调通 (发送一条最小 ping 请求)',
  })
  async diagnose() {
    const primary = this.arkConfigService.getPrimaryConfig('text');
    if (!primary) {
      return {
        ok: false,
        stage: 'config',
        reason:
          '未配置 ARK 文本模型环境变量 ARK_TEXT_PRIMARY_ENDPOINT_ID / ARK_TEXT_PRIMARY_API_KEY',
      };
    }

    // 直接从 config 读取来源元数据,不再做字符串猜测
    const keySource = primary.apiKeySource ?? 'builtin';
    const endpointSource = primary.endpointSource ?? 'builtin';

    const startedAt = Date.now();
    const apiKeyFingerprint = fingerprint(primary.apiKey);
    const endpointFingerprint = fingerprint(primary.endpointId);

    const buildHint = (ok: boolean): string => {
      if (keySource === 'env') {
        return ok
          ? '当前使用 env 注入的 key,调用成功'
          : 'Key 来源: env(ARK_TEXT_PRIMARY_API_KEY)。请检查环境变量中的凭证和端点配置';
      }
      return ok ? '当前使用代码内置配置,调用成功' : '当前未配置可用的 ARK 凭证';
    };

    try {
      const resp = await this.arkTextService.chatCompletion({
        messages: [
          { role: 'system', content: '你是一个测试机器人, 只输出 pong' },
          { role: 'user', content: 'ping' },
        ],
        temperature: 0,
        maxTokens: 8,
      });
      const content = resp?.choices?.[0]?.message?.content ?? '(empty)';
      return {
        ok: true,
        stage: 'call',
        endpointId: primary.endpointId,
        durationMs: Date.now() - startedAt,
        sample: String(content).slice(0, 64),
        keySource,
        endpointSource,
        hint: buildHint(true),
        apiKeyFingerprint,
        endpointFingerprint,
      };
    } catch (error: any) {
      return {
        ok: false,
        stage: 'call',
        endpointId: primary.endpointId,
        durationMs: Date.now() - startedAt,
        reason: error?.message ?? String(error),
        keySource,
        endpointSource,
        hint: buildHint(false),
        apiKeyFingerprint,
        endpointFingerprint,
      };
    }
  }

  @Post('ark/chat')
  @ApiOperation({ summary: '文本对话' })
  async chatCompletion(
    @Body() dto: { messages: Array<{ role: string; content: string }>; modelKey?: string }
  ) {
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

  /** Provider override 会影响所有用户，仅允许启用中的管理员修改。 */
  @UseGuards(AdminGuard)
  @Patch('ark/configs/:key')
  @ApiOperation({ summary: '更新某个模型的 endpoint / apiKey,持久化到 ark_model_overrides' })
  async updateConfig(
    @Param('key') key: string,
    @Body() dto: { endpointId?: string; apiKey?: string },
    @CurrentUser() user: JwtPayload
  ) {
    if (!dto || (dto.endpointId === undefined && dto.apiKey === undefined)) {
      throw new HttpException('请至少提供 endpointId 或 apiKey 之一', HttpStatus.BAD_REQUEST);
    }
    try {
      const updated = await this.arkConfigService.setOverride(key, dto, user.sub);
      if (!updated) {
        throw new HttpException(`未知模型 key: ${key}`, HttpStatus.NOT_FOUND);
      }
      return {
        ...updated,
        apiKey: updated.apiKey ? `${updated.apiKey.slice(0, 4)}...${updated.apiKey.slice(-4)}` : '',
        apiKeyFingerprint: fingerprint(updated.apiKey),
        endpointFingerprint: fingerprint(updated.endpointId),
      };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message ?? '写入 override 失败',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(AdminGuard)
  @Delete('ark/configs/:key/override')
  @ApiOperation({ summary: '清除某个模型的 DB override,回落到 env / builtin' })
  async clearOverride(@Param('key') key: string) {
    const result = await this.arkConfigService.clearOverride(key);
    if (!result) {
      throw new HttpException(`未知模型 key: ${key}`, HttpStatus.NOT_FOUND);
    }
    return {
      ...result,
      apiKey: result.apiKey ? `${result.apiKey.slice(0, 4)}...${result.apiKey.slice(-4)}` : '',
      apiKeyFingerprint: fingerprint(result.apiKey),
      endpointFingerprint: fingerprint(result.endpointId),
    };
  }
}
