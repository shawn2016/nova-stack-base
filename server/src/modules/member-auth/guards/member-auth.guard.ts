import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../../auth/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { stripApiPrefix } from '../../../common/constants/api-prefix';

/** C 端路由：拒绝 type=admin 的 JWT */
@Injectable()
export class MemberAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      path?: string;
      url?: string;
    }>();
    const path = stripApiPrefix(request.path ?? request.url ?? '');

    if (!path.startsWith('/member/')) {
      return true;
    }

    const user = request.user;

    if (!user) {
      return true;
    }

    if (user.type !== 'member') {
      throw new ForbiddenException('Member access required');
    }

    return true;
  }
}
