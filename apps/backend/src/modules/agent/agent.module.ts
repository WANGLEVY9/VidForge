import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { OrchestratorService } from './orchestrator.service';
import { MaterialAgentService } from './agents/material-agent.service';
import { ScriptAgentService } from './agents/script-agent.service';
import { CompositionAgentService } from './agents/composition-agent.service';
import { QualityAgentService } from './agents/quality-agent.service';

@Module({
  controllers: [AgentController],
  providers: [
    AgentService,
    OrchestratorService,
    MaterialAgentService,
    ScriptAgentService,
    CompositionAgentService,
    QualityAgentService,
  ],
  exports: [AgentService, OrchestratorService],
})
export class AgentModule {}
