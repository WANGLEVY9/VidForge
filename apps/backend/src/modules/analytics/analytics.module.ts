import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Material } from '../material/entities/material.entity';
import { Script } from '../script/entities/script.entity';
import { CreationTask } from '../creation/entities/creation-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material, Script, CreationTask])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
