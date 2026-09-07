import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * 自定义限流守卫
 * 根据用户ID或IP地址进行限流
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * 获取限流追踪键
   * 优先使用用户ID，如果未登录则使用IP地址
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // 如果用户已登录，使用用户ID作为限流key
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }

    // 未登录用户使用IP地址
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }
}

