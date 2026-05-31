import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TraceSpan } from './trace.entity';
import { TraceService } from './trace.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([TraceSpan])],
  providers: [TraceService],
  exports: [TraceService, TypeOrmModule],
})
export class TraceModule {}
