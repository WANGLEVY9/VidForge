import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class ScriptAgentService {
  private readonly logger = new Logger(ScriptAgentService.name);

  async generate(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[${state.taskId}] Generating script for: ${state.productName}`);

    const shots = [
      { id: `shot_${Date.now()}_1`, order: 1, description: `${state.productName} 外观展示，突出产品设计`, duration: 5, type: 'text-to-video' as const, script: `${state.productName}，全新亮相` },
      { id: `shot_${Date.now()}_2`, order: 2, description: `核心卖点展示：${state.sellingPoints.slice(0, 30)}`, duration: 8, type: 'text-to-video' as const, script: state.sellingPoints },
      { id: `shot_${Date.now()}_3`, order: 3, description: '使用场景演示，真实用户体验', duration: 6, type: 'text-to-video' as const, script: '真实体验，效果看得见' },
      { id: `shot_${Date.now()}_4`, order: 4, description: '成分/技术原理解析动画', duration: 5, type: 'text-to-video' as const, script: '科技赋能，品质保障' },
      { id: `shot_${Date.now()}_5`, order: 5, description: '购买引导CTA，限时优惠', duration: 3, type: 'text-to-video' as const, script: '立即购买，享受限时优惠' },
    ];

    return {
      scriptGeneration: {
        shots,
        voiceover: `大家好，今天给大家介绍${state.productName}。${state.sellingPoints}。赶快下单吧！`,
        style: state.style || 'professional',
      },
    };
  }
}
