import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    const hasPermission = this.validatePermissions(
      user.permissions || [],
      requiredPermissions,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `需要以下权限: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }

  private validatePermissions(
    userPermissions: string[],
    requiredPermissions: string[],
  ): boolean {
    // 超级管理员权限
    if (userPermissions.includes('*:*')) {
      return true;
    }

    // 检查是否拥有所有必需权限
    return requiredPermissions.every((permission) =>
      this.hasPermission(userPermissions, permission),
    );
  }

  private hasPermission(
    userPermissions: string[],
    requiredPermission: string,
  ): boolean {
    // 直接匹配
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // 通配符匹配 (如 ticket:* 匹配 ticket:create)
    const [resource, action] = requiredPermission.split(':');
    const wildcardPermission = `${resource}:*`;

    return userPermissions.includes(wildcardPermission);
  }
}
