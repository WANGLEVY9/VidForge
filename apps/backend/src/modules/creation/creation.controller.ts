import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreationService } from './creation.service';
import { CreateTaskDto } from './dto/create-task.dto';

@ApiTags('视频创作')
@Controller('creation')
export class CreationController {
  constructor(private readonly creationService: CreationService) {}

  @Post('task')
  @ApiOperation({ summary: '创建视频生成任务' })
  createTask(@Body() dto: CreateTaskDto) {
    return this.creationService.createTask(dto);
  }

  @Get('task')
  @ApiOperation({ summary: '获取任务列表' })
  findAll() {
    return this.creationService.findAll();
  }

  @Get('task/:id')
  @ApiOperation({ summary: '获取任务详情' })
  findOne(@Param('id') id: string) {
    return this.creationService.findOne(id);
  }
}
