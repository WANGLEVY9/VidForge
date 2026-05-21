import { Controller, Post, Get, Delete, Param, Body, Query, Put } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScriptService } from './script.service';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { UpdateScriptStoryboardsDto } from './dto/update-storyboard.dto';

@ApiTags('剧本管理')
@Controller('script')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  @Post('generate')
  @ApiOperation({ summary: '生成剧本' })
  generate(@Body() generateScriptDto: GenerateScriptDto) {
    return this.scriptService.generateScript(generateScriptDto);
  }

  @Get()
  @ApiOperation({ summary: '获取剧本列表' })
  findAll(@Query() query: { page?: number; pageSize?: number; keyword?: string }) {
    return this.scriptService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取剧本详情' })
  findOne(@Param('id') id: string) {
    return this.scriptService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除剧本' })
  remove(@Param('id') id: string) {
    return this.scriptService.remove(id);
  }

  @Put(':id/storyboards')
  @ApiOperation({ summary: '更新剧本分镜' })
  updateStoryboards(
    @Param('id') id: string,
    @Body() updateDto: UpdateScriptStoryboardsDto,
  ) {
    return this.scriptService.updateStoryboards(id, updateDto.storyboards);
  }

  @Post(':id/storyboards/:index/regenerate')
  @ApiOperation({ summary: '重新生成指定分镜' })
  regenerateStoryboard(
    @Param('id') id: string,
    @Param('index') index: number,
    @Body() body: { prompt?: string },
  ) {
    return this.scriptService.regenerateStoryboard(id, index, body.prompt);
  }
}
