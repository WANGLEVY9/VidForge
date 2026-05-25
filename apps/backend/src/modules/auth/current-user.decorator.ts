import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * 参数装饰器：在 controller 方法里用 @CurrentUser() user 拿到当前登录用户
 * 必须配合 JwtAuthGuard 使用
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as JwtPayload | undefined;
  },
);
