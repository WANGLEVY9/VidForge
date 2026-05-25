import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ExportTask } from './entities/export-task.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ExportTask]), AuthModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
