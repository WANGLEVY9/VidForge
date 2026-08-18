import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { OrchestratorService } from './orchestrator.service';
import { MaterialAgentService } from './agents/material-agent.service';
import { ScriptAgentService } from './agents/script-agent.service';
import { CompositionAgentService } from './agents/composition-agent.service';
import { QualityAgentService } from './agents/quality-agent.service';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { ScriptModule } from '../script/script.module';
import { ProductSpaceModule } from '../product-space/product-space.module';
import { Material } from '../material/entities/material.entity';
import { AgentRun } from './entities/agent-run.entity';
import { AgentMemory } from './memory/agent-memory.entity';
import { AgentMemoryService } from './memory/agent-memory.service';
import { AgentCheckpointService } from './checkpoint/agent-checkpoint.service';
import { ProviderOperation } from './provider-operations/provider-operation.entity';
import { ProviderOperationService } from './provider-operations/provider-operation.service';
import { AgentOutboxEvent } from './outbox/agent-outbox-event.entity';
import { AgentOutboxService } from './outbox/agent-outbox.service';

@Module({
  imports: [
    AuthModule,
    AiModule,
    ScriptModule,
    ProductSpaceModule,
    TypeOrmModule.forFeature([
      Material,
      AgentRun,
      AgentMemory,
      ProviderOperation,
      AgentOutboxEvent,
    ]),
  ],
  controllers: [AgentController],
  providers: [
    AgentService,
    OrchestratorService,
    MaterialAgentService,
    ScriptAgentService,
    CompositionAgentService,
    QualityAgentService,
    AgentMemoryService,
    AgentCheckpointService,
    ProviderOperationService,
    AgentOutboxService,
  ],
  exports: [AgentService, OrchestratorService, AgentOutboxService],
})
export class AgentModule {}
