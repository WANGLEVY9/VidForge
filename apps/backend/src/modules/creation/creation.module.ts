import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VideoTask } from './entities/video-task.entity';
import { CreationController } from './creation.controller';
import { CreationService } from './creation.service';
import { VideoRenderService } from './services/video-render.service';
import { VideoRenderProcessor } from './processors/video-render.processor';
import { VIDEO_RENDER_QUEUE, getQueueConfig } from './config/queue.config';
import { ScriptModule } from '../script/script.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoTask]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getQueueConfig(configService),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: VIDEO_RENDER_QUEUE,
    }),
    ScriptModule,
    CommonModule,
  ],
  controllers: [CreationController],
  providers: [CreationService, VideoRenderService, VideoRenderProcessor],
  exports: [CreationService],
})
export class CreationModule {}
