import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { resolveJwtSecret, shouldSeedDemoUser } from './auth.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        return {
          secret: resolveJwtSecret(cfg.get<string>('NODE_ENV'), cfg.get<string>('JWT_SECRET')),
          signOptions: {
            expiresIn: cfg.get<string>('JWT_EXPIRES_IN') || '7d',
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtAuthGuard, AdminGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, AdminGuard, JwtModule],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const seedFlag = this.configService.get<string>('SEED_DEMO_USER');
    if (!shouldSeedDemoUser(nodeEnv, seedFlag)) {
      if (nodeEnv === 'production' && seedFlag === 'true') {
        this.logger.warn('SEED_DEMO_USER is ignored in production');
      }
      return;
    }

    await this.authService.ensureDemoUser(
      this.configService.get<string>('DEMO_USER_EMAIL') || 'demo@vidforge.app',
      this.configService.get<string>('DEMO_USER_PASSWORD') || 'demo1234'
    );
  }
}
