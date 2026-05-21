import { Module } from '@nestjs/common';
import { TtsService } from './services/tts.service';
import { AiController } from './ai.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [AiController],
  providers: [TtsService],
  exports: [TtsService],
})
export class AiModule {}
