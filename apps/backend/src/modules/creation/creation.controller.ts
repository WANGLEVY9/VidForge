import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreationService } from './creation.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { RegenerateShotDto } from './dto/regenerate-shot.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('视频创作')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('creation')
export class CreationController {
  constructor(private readonly creationService: CreationService) {}

  @Post('task')
  @ApiOperation({ summary: '创建视频生成任务' })
  createTask(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.creationService.createTask(user.sub, dto);
  }

  @Get('task')
  @ApiOperation({ summary: '获取任务列表（按用户隔离，可按 spaceId 过滤）' })
  findAll(@CurrentUser() user: JwtPayload, @Query('spaceId') spaceId?: string) {
    return this.creationService.findAll(user.sub, spaceId);
  }

  @Get('task/:id')
  @ApiOperation({ summary: '获取任务详情' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.creationService.findOne(user.sub, id);
  }

  @Patch('task/:id/shot')
  @ApiOperation({ summary: '重新生成单个分镜' })
  regenerateShot(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RegenerateShotDto
  ) {
    return this.creationService.regenerateShot(user.sub, id, dto);
  }
}
