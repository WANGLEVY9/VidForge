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
        const databaseUrl = configService.get('DATABASE_URL');
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: configService.get('NODE_ENV') === 'development',
            logging: configService.get('NODE_ENV') === 'development',
            ssl: configService.get('NODE_ENV') === 'production'
              ? { rejectUnauthorized: false }
              : false,
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
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),

    // 业务模块
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
