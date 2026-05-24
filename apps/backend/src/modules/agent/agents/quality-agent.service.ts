import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class QualityAgentService {
  private readonly logger = new Logger(QualityAgentService.name);

  async evaluate(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] Evaluating quality for: ${state.productName}`);

    const issues: string[] = [];
    let qualityScore = 85;

    if (!state.scriptGeneration?.shots.length) {
      issues.push('No shots generated');
      qualityScore -= 20;
    }

    const passed = qualityScore >= 60;

    return {
      qualityControl: {
        contentScore: qualityScore,
        qualityScore,
        passed,
        issues,
      },
    };
  }
}
