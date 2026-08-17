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
