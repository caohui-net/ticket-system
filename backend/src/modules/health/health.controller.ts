import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '系统健康检查' })
  @ApiResponse({
    status: 200,
    description: '系统健康',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 123.456,
        environment: 'production',
      },
    },
  })
  async check() {
    return this.healthService.getSystemHealth();
  }

  @Get('db')
  @ApiOperation({ summary: '数据库健康检查' })
  @ApiResponse({
    status: 200,
    description: '数据库连接正常',
    schema: {
      example: {
        status: 'ok',
        database: 'connected',
        latency: 12,
      },
    },
  })
  async checkDatabase() {
    return this.healthService.getDatabaseHealth();
  }

  @Get('redis')
  @ApiOperation({ summary: 'Redis健康检查' })
  @ApiResponse({
    status: 200,
    description: 'Redis连接正常',
    schema: {
      example: {
        status: 'ok',
        redis: 'connected',
        latency: 5,
      },
    },
  })
  async checkRedis() {
    return this.healthService.getRedisHealth();
  }

  @Get('all')
  @ApiOperation({ summary: '完整健康检查' })
  @ApiResponse({
    status: 200,
    description: '所有服务健康状态',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 123.456,
        environment: 'production',
        services: {
          database: { status: 'ok', latency: 12 },
          redis: { status: 'ok', latency: 5 },
        },
      },
    },
  })
  async checkAll() {
    return this.healthService.getCompleteHealth();
  }
}
