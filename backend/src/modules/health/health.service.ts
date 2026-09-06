import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // 初始化Redis客户端
    this.redis = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD'),
      retryStrategy: () => null, // 不重试，快速失败
      lazyConnect: true,
    });
  }

  async getSystemHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  async getDatabaseHealth() {
    const startTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;
      return {
        status: 'ok',
        database: 'connected',
        latency,
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error.message,
      };
    }
  }

  async getRedisHealth() {
    const startTime = Date.now();
    try {
      await this.redis.connect();
      await this.redis.ping();
      const latency = Date.now() - startTime;
      await this.redis.disconnect();
      return {
        status: 'ok',
        redis: 'connected',
        latency,
      };
    } catch (error) {
      return {
        status: 'error',
        redis: 'disconnected',
        error: error.message,
      };
    }
  }

  async getCompleteHealth() {
    const [system, database, redis] = await Promise.all([
      this.getSystemHealth(),
      this.getDatabaseHealth(),
      this.getRedisHealth(),
    ]);

    const allHealthy =
      database.status === 'ok' && redis.status === 'ok';

    return {
      ...system,
      status: allHealthy ? 'ok' : 'degraded',
      services: {
        database,
        redis,
      },
    };
  }

  onModuleDestroy() {
    // 清理Redis连接
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
