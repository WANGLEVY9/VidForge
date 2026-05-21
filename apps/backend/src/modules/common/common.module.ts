import { Module } from '@nestjs/common';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { OssService } from './services/oss.service';
import { RedisService } from './services/redis.service';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    OssService,
    RedisService,
  ],
  exports: [OssService, RedisService],
})
export class CommonModule {}
