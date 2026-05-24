import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class MaterialAgentService {
  private readonly logger = new Logger(MaterialAgentService.name);

  async analyze(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] Analyzing materials for: ${state.productName}`);

    const tags = {
      category: state.category,
      style: state.style || 'modern',
      keywords: state.sellingPoints.split(',').map((s) => s.trim()),
    };

    return {
      materialAnalysis: {
        matchedMaterials: [],
        tags,
        analysis: `Analyzed materials for "${state.productName}" in category "${state.category}". Style: ${state.style || 'modern'}.`,
      },
    };
  }
}
