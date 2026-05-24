import { Injectable, Logger } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { AgentResult } from './interfaces/agent-result.interface';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private results = new Map<string, AgentResult>();

  constructor(private readonly orchestrator: OrchestratorService) {}

  async run(dto: RunAgentDto): Promise<AgentResult> {
    const result = await this.orchestrator.run(dto);
    this.results.set(result.taskId, result);
    return result;
  }

  getStatus(taskId: string): AgentResult | null {
    return this.results.get(taskId) ?? null;
  }

  cancel(taskId: string): boolean {
    return this.orchestrator.cancel(taskId);
  }
}
