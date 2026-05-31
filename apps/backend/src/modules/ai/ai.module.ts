import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { ArkConfigService } from './services/ark-config.service';
import { ArkTextService } from './services/ark-text.service';
import { ArkVideoService } from './services/ark-video.service';
import { ArkVisionService } from './services/ark-vision.service';
import { ArkResponseCacheService } from './services/ark-response-cache.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [
    ArkConfigService,
    ArkTextService,
    ArkVideoService,
    ArkVisionService,
    ArkResponseCacheService,
  ],
  exports: [
    ArkConfigService,
    ArkTextService,
    ArkVideoService,
    ArkVisionService,
    ArkResponseCacheService,
  ],
})
export class AiModule {}
