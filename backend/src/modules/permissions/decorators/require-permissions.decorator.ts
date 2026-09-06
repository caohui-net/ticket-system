import { SetMetadata } from '@nestjs/common';

/**
 * 权限装饰器
 * @param permissions 需要的权限列表
 * @example @RequirePermissions('ticket:create', 'ticket:update')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

export const PERMISSIONS_KEY = 'permissions';
