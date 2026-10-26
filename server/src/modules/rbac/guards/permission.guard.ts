import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { AuthService } from '../../auth/auth.service';
import { AuthUser } from '../../auth/decorators/current-user.decorator';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

const PERMISSION_CACHE_KEY = '__novaPermissionCache';

type PermissionCache = Map<string, Promise<string[]>>;

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      [PERMISSION_CACHE_KEY]?: PermissionCache;
    }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (!request[PERMISSION_CACHE_KEY]) {
      request[PERMISSION_CACHE_KEY] = new Map();
    }

    const cache = request[PERMISSION_CACHE_KEY]!;
    let permissionsPromise = cache.get(user.userId);
    if (!permissionsPromise) {
      permissionsPromise = this.authService.getUserPermissions(user.userId);
      cache.set(user.userId, permissionsPromise);
    }

    const permissions = await permissionsPromise;
    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
