import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductSpace } from './entities/product-space.entity';
import { ProductSpaceService } from './product-space.service';
import { ProductSpaceController } from './product-space.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductSpace]), AuthModule],
  providers: [ProductSpaceService],
  controllers: [ProductSpaceController],
  exports: [ProductSpaceService],
})
export class ProductSpaceModule {}
