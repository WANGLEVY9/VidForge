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

@Module({
  imports: [
    AuthModule,
    AiModule,
    ScriptModule,
    ProductSpaceModule,
    TypeOrmModule.forFeature([Material, AgentRun, AgentMemory]),
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
  ],
  exports: [AgentService, OrchestratorService],
})
export class AgentModule {}
