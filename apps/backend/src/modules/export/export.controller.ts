import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { CreateExportDto } from './dto/create-export.dto';

@ApiTags('视频导出')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  @ApiOperation({ summary: '创建导出任务' })
  create(@Body() dto: CreateExportDto) {
    return this.exportService.create(dto);
  }

  @Get('list')
  @ApiOperation({ summary: '导出历史列表' })
  findAll() {
    return this.exportService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '导出任务详情' })
  findOne(@Param('id') id: string) {
    return this.exportService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '取消导出任务' })
  cancel(@Param('id') id: string) {
    return this.exportService.cancel(id);
  }
}
