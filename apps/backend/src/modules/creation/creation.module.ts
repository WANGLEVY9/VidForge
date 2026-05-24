import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreationController } from './creation.controller';
import { CreationService } from './creation.service';
import { CreationTask } from './entities/creation-task.entity';
import { CreationGateway } from './gateway/creation.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([CreationTask])],
  controllers: [CreationController],
  providers: [CreationService, CreationGateway],
  exports: [CreationService],
})
export class CreationModule {}
