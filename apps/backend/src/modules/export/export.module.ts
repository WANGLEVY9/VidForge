import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ExportTask } from './entities/export-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExportTask])],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
