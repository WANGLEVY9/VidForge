import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { RunAgentDto } from './dto/run-agent.dto';

@ApiTags('Agent 编排')
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('run')
  @ApiOperation({ summary: '启动完整 Agent 工作流' })
  run(@Body() dto: RunAgentDto) {
    return this.agentService.run(dto);
  }

  @Get('status/:taskId')
  @ApiOperation({ summary: '查询工作流状态' })
  getStatus(@Param('taskId') taskId: string) {
    return this.agentService.getStatus(taskId);
  }

  @Post('cancel/:taskId')
  @ApiOperation({ summary: '取消进行中的工作流' })
  cancel(@Param('taskId') taskId: string) {
    return this.agentService.cancel(taskId);
  }
}
