import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScriptService } from './script.service';
import { CreateScriptDto } from './dto/create-script.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';

@ApiTags('剧本管理')
@Controller('script')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  @Post('generate')
  @ApiOperation({ summary: 'AI生成剧本' })
  generate(@Body() dto: GenerateScriptDto) {
    return this.scriptService.generate(dto);
  }

  @Post()
  @ApiOperation({ summary: '保存剧本' })
  create(@Body() dto: CreateScriptDto) {
    return this.scriptService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取剧本列表' })
  findAll() {
    return this.scriptService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取剧本详情' })
  findOne(@Param('id') id: string) {
    return this.scriptService.findOne(id);
  }
}
