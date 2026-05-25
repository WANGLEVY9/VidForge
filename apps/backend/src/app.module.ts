import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from './modules/ai/ai.module';
import { MaterialModule } from './modules/material/material.module';
import { ScriptModule } from './modules/script/script.module';
import { CreationModule } from './modules/creation/creation.module';
import { AgentModule } from './modules/agent/agent.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ExportModule } from './modules/export/export.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductSpaceModule } from './modules/product-space/product-space.module';
import { HealthController } from './modules/common/health.controller';

@Module({
  imports: [
    // 全局配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 数据库配置
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV');
        // 是否同步表结构：dev 默认开；生产由 DB_SYNCHRONIZE=true 显式开启（用于初次建表）
        const syncEnv = configService.get<string>('DB_SYNCHRONIZE');
        const synchronize = syncEnv !== undefined
          ? syncEnv === 'true'
          : nodeEnv === 'development';
        const logging = nodeEnv === 'development';
        const ssl = nodeEnv === 'production' ? { rejectUnauthorized: false } : false;

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize,
            logging,
            ssl,
            // 启动时即建立连接池，便于早期发现配置问题
            autoLoadEntities: true,
          };
        }
        return {
          type: 'postgres',
          host: configService.get('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get('DB_USER'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize,
          logging,
          ssl,
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),

    // 业务模块
    AuthModule,
    ProductSpaceModule,
    AiModule,
    MaterialModule,
    ScriptModule,
    CreationModule,
    AgentModule,
    AnalyticsModule,
    ExportModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
