import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

type AuthenticatedRequest = Request & { user?: JwtPayload };

/**
 * 验证当前 JWT 对应的用户仍然是启用状态的管理员。
 *
 * 不仅依赖 JWT 中的 role，还会回查数据库，避免用户被降权后旧令牌继续
 * 修改全局 Provider 配置。
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const payload = request.user;
    if (!payload?.sub) {
      throw new ForbiddenException('需要管理员权限');
    }

    const user = await this.authService.findById(payload.sub);
    if (!user || !user.isActive || user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可以修改 AI Provider 配置');
    }

    return true;
  }
}
