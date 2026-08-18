import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AgentMemoryService } from './memory/agent-memory.service';
import { ReviewAgentDto } from './dto/review-agent.dto';

@ApiTags('Agent 编排')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly memoryService: AgentMemoryService
  ) {}

  @Post('run')
  @ApiOperation({ summary: '创建并异步启动完整 Agent 工作流（支持 Idempotency-Key）' })
  run(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RunAgentDto,
    @Headers('idempotency-key') idempotencyKey?: string
  ) {
    return this.agentService.run({ ...dto, userId: user.sub }, idempotencyKey);
  }

  @Get('status/:taskId')
  @ApiOperation({ summary: '查询工作流状态' })
  getStatus(@CurrentUser() user: JwtPayload, @Param('taskId') taskId: string) {
    return this.agentService.getStatus(user.sub, taskId);
  }

  @Get('runs/:taskId/audit')
  @ApiOperation({ summary: '查看 Agent 运行控制面、checkpoint 时间线与 Provider 操作账本' })
  getAudit(@CurrentUser() user: JwtPayload, @Param('taskId') taskId: string) {
    return this.agentService.getAudit(user.sub, taskId);
  }

  @Post('runs/:taskId/resume')
  @ApiOperation({ summary: '提交人工审核决定并恢复被 interrupt 暂停的 Agent 工作流' })
  resume(
    @CurrentUser() user: JwtPayload,
    @Param('taskId') taskId: string,
    @Body() dto: ReviewAgentDto
  ) {
    return this.agentService.resumeWithHumanReview(user.sub, taskId, dto);
  }

  @Get('runs/:taskId/checkpoints/:checkpointId')
  @ApiOperation({ summary: '读取单个 checkpoint 的脱敏状态投影' })
  inspectCheckpoint(
    @CurrentUser() user: JwtPayload,
    @Param('taskId') taskId: string,
    @Param('checkpointId') checkpointId: string
  ) {
    return this.agentService.inspectCheckpoint(user.sub, taskId, checkpointId);
  }

  @Post('runs/:taskId/replay')
  @ApiOperation({ summary: '从该运行最新 checkpoint 继续执行' })
  replay(@CurrentUser() user: JwtPayload, @Param('taskId') taskId: string) {
    return this.agentService.replay(user.sub, taskId);
  }

  @Post('runs/:taskId/fork')
  @ApiOperation({ summary: '从指定 checkpoint 创建一个新的 Agent 分支运行' })
  fork(
    @CurrentUser() user: JwtPayload,
    @Param('taskId') taskId: string,
    @Query('checkpointId') checkpointId?: string
  ) {
    return this.agentService.fork(user.sub, taskId, checkpointId);
  }

  @Post('cancel/:taskId')
  @ApiOperation({ summary: '取消进行中的工作流' })
  cancel(@CurrentUser() user: JwtPayload, @Param('taskId') taskId: string) {
    return this.agentService.cancel(user.sub, taskId);
  }

  @Get('memory')
  @ApiOperation({ summary: '查看或召回当前用户的 Agent 长期记忆' })
  listMemory(
    @CurrentUser() user: JwtPayload,
    @Query('productSpaceId') productSpaceId?: string,
    @Query('query') query?: string,
    @Query('limit') limit?: string
  ) {
    if (query?.trim()) {
      return this.memoryService.recall({
        userId: user.sub,
        productSpaceId,
        query,
        limit: limit ? Number(limit) : undefined,
      });
    }
    return this.memoryService.listForUser(user.sub, productSpaceId, limit ? Number(limit) : 50);
  }

  @Delete('memory/:id')
  @ApiOperation({ summary: '删除当前用户的一条 Agent 长期记忆' })
  removeMemory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.memoryService.removeForUser(user.sub, id).then((removed) => ({ removed }));
  }
}
