import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { CreateExportDto } from './dto/create-export.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('视频导出')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  @ApiOperation({ summary: '创建导出任务' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateExportDto) {
    return this.exportService.create(user.sub, dto);
  }

  @Get('list')
  @ApiOperation({ summary: '导出历史列表' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.exportService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: '导出任务详情' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.exportService.findOne(user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '取消导出任务' })
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.exportService.cancel(user.sub, id);
  }
}
