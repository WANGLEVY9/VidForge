import { Controller, Post, Get, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreationService } from './creation.service';
import { CreateVideoTaskDto } from './dto/create-video-task.dto';
import { VideoTaskStatus } from './entities/video-task.entity';
import { IsPublic } from '../auth/decorators/is-public.decorator';

@ApiTags('视频创作')
@Controller('creation')
export class CreationController {
  constructor(private readonly creationService: CreationService) {}

  @Post('task')
  @ApiOperation({ summary: '创建视频生成任务' })
  createTask(@Body() createVideoTaskDto: CreateVideoTaskDto) {
    return this.creationService.createVideoTask(createVideoTaskDto);
  }

  @Get('task')
  @ApiOperation({ summary: '获取任务列表' })
  findAll(
    @Query()
    query: {
      page?: number;
      pageSize?: number;
      keyword?: string;
      status?: VideoTaskStatus;
    },
  ) {
    return this.creationService.findAll(query);
  }

  @Get('task/:id')
  @ApiOperation({ summary: '获取任务详情' })
  findOne(@Param('id') id: string) {
    return this.creationService.findOne(id);
  }

  @Get('task/:id/progress')
  @ApiOperation({ summary: '获取任务进度' })
  @IsPublic() // 进度查询接口公开，方便前端轮询
  getProgress(@Param('id') id: string) {
    return this.creationService.getTaskProgress(id);
  }

  @Delete('task/:id')
  @ApiOperation({ summary: '删除任务' })
  remove(@Param('id') id: string) {
    return this.creationService.remove(id);
  }

  @Post('task/:id/retry')
  @ApiOperation({ summary: '重试失败的任务' })
  retryTask(@Param('id') id: string) {
    return this.creationService.retryTask(id);
  }

  @Post('task/:id/export')
  @ApiOperation({ summary: '导出视频，支持指定分辨率和格式' })
  exportVideo(
    @Param('id') id: string,
    @Body() exportParams: { resolution?: VideoResolution; format?: ExportFormat },
  ) {
    // 后续实现重新导出逻辑
    return { success: true, message: '导出功能开发中' };
  }
}
