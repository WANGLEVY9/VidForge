import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Script } from './entities/script.entity';
import { Storyboard } from './entities/storyboard.entity';
import { ScriptController } from './script.controller';
import { ScriptService } from './script.service';

@Module({
  imports: [TypeOrmModule.forFeature([Script, Storyboard])],
  controllers: [ScriptController],
  providers: [ScriptService],
  exports: [ScriptService],
})
export class ScriptModule {}
