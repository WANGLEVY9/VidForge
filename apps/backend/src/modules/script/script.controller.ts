import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScriptService } from './script.service';
import { CreateScriptDto } from './dto/create-script.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { UpdateScriptShotsDto } from './dto/update-script-shots.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { searchHitScripts } from '../rag/hit-scripts.seed';

@ApiTags('剧本管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('script')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  @Post('generate')
  @ApiOperation({ summary: 'AI生成剧本(自动 RAG 注入爆款参考)' })
  generate(@CurrentUser() user: JwtPayload, @Body() dto: GenerateScriptDto) {
    return this.scriptService.generate(user.sub, dto);
  }

  @Get('inspire')
  @ApiOperation({ summary: '生成前预览同品类同风格的爆款参考脚本' })
  inspire(@Query('category') category?: string, @Query('style') style?: string) {
    return searchHitScripts({ category, style, topK: 3 });
  }

  @Post()
  @ApiOperation({ summary: '保存剧本' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateScriptDto) {
    return this.scriptService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取剧本列表(按用户隔离,可按 spaceId 过滤)' })
  findAll(@CurrentUser() user: JwtPayload, @Query('spaceId') spaceId?: string) {
    return this.scriptService.findAll(user.sub, spaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取剧本详情' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scriptService.findOne(user.sub, id);
  }

  @Patch(':id/shots')
  @ApiOperation({ summary: '更新分镜列表(编辑/排序后保存)' })
  updateShots(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateScriptShotsDto) {
    return this.scriptService.updateShots(user.sub, id, dto);
  }

  @Post(':id/regenerate-shot')
  @ApiOperation({ summary: '重新生成单个分镜' })
  regenerateShot(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body('index') index: number) {
    return this.scriptService.regenerateShot(user.sub, id, index);
  }
}
