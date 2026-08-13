import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const isProduction = cfg.get<string>('NODE_ENV') === 'production';
        const configuredSecret = cfg.get<string>('JWT_SECRET')?.trim();

        if (isProduction && (!configuredSecret || configuredSecret.length < 32)) {
          throw new Error('JWT_SECRET must contain at least 32 characters in production');
        }

        return {
          secret: configuredSecret || 'vidforge-local-development-only-secret',
          signOptions: {
            expiresIn: cfg.get<string>('JWT_EXPIRES_IN') || '7d',
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit() {
    if (this.configService.get<string>('SEED_DEMO_USER') !== 'true') return;

    if (this.configService.get<string>('NODE_ENV') === 'production') {
      this.logger.warn('SEED_DEMO_USER is ignored in production');
      return;
    }

    await this.authService.ensureDemoUser(
      this.configService.get<string>('DEMO_USER_EMAIL') || 'demo@vidforge.app',
      this.configService.get<string>('DEMO_USER_PASSWORD') || 'demo1234'
    );
  }
}
