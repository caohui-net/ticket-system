import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { QueryStatisticsDto, QueryTrendDto } from './dto/query-statistics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('统计报表')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '获取概览统计数据' })
  async getOverview() {
    return this.statisticsService.getOverview();
  }

  @Get('tickets/by-status')
  @ApiOperation({ summary: '按状态统计工单' })
  async getTicketsByStatus() {
    return this.statisticsService.getTicketsByStatus();
  }

  @Get('tickets/by-priority')
  @ApiOperation({ summary: '按优先级统计工单' })
  async getTicketsByPriority() {
    return this.statisticsService.getTicketsByPriority();
  }

  @Get('tickets/trend')
  @ApiOperation({ summary: '工单趋势统计' })
  async getTicketsTrend(@Query() query: QueryTrendDto) {
    const days = query.days || 7;
    return this.statisticsService.getTicketsTrend(days);
  }

  @Get('response-time')
  @ApiOperation({ summary: '响应时间统计' })
  async getResponseTime() {
    return this.statisticsService.getResponseTimeStatistics();
  }

  @Get('users/workload')
  @ApiOperation({ summary: '用户工作量统计' })
  async getUserWorkload() {
    return this.statisticsService.getUserWorkload();
  }

  @Get('users/active')
  @ApiOperation({ summary: '活跃用户统计' })
  async getActiveUsers() {
    return this.statisticsService.getActiveUsers();
  }
}
