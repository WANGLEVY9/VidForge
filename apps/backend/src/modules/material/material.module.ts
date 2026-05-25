import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';
import { Material } from './entities/material.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Material]), HttpModule, AuthModule],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}
