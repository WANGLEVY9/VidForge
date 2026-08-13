import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Agent 编排')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('run')
  @ApiOperation({ summary: '创建并异步启动完整 Agent 工作流' })
  run(@CurrentUser() user: JwtPayload, @Body() dto: RunAgentDto) {
    return this.agentService.run({ ...dto, userId: user.sub });
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
}
