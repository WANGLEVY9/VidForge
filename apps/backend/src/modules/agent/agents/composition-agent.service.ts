import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class CompositionAgentService {
  private readonly logger = new Logger(CompositionAgentService.name);

  async compose(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] Composing video for: ${state.productName}`);

    const totalDuration = state.scriptGeneration?.shots.reduce((s, shot) => s + shot.duration, 0) ?? 30;

    return {
      videoComposition: {
        videoUrl: '#',
        duration: totalDuration,
        ttsUrl: '#',
        subtitleUrl: '#',
        bgmUrl: '#',
      },
    };
  }
}
