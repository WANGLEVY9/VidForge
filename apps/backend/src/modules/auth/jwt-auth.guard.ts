import { Injectable, UnauthorizedException, ExecutionContext, CanActivate } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * JWT 认证守卫
 * - 从 Authorization: Bearer <token> 中解析 jwt
 * - 解析失败抛 401
 * - 解析成功把 payload 挂到 req.user 上
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'] || req.headers['Authorization' as any];
    if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少访问令牌');
    }
    const token = auth.slice(7).trim();
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      (req as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('访问令牌无效或已过期');
    }
  }
}
