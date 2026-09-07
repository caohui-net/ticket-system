import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { QueryStatisticsDto, QueryTrendDto } from './dto/query-statistics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimeRange } from './interfaces/statistics.interface';

@ApiTags('统计报表')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statistics')
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

  /**
   * 获取审批效率统计
   */
  @Get('approval/efficiency')
  @ApiOperation({ summary: '审批效率统计' })
  async getApprovalEfficiency(@Query('timeRange') timeRange?: TimeRange) {
    return this.statisticsService.getApprovalEfficiency(timeRange);
  }

  /**
   * 获取各角色审批量统计
   */
  @Get('approval/by-role')
  @ApiOperation({ summary: '各角色审批量统计' })
  async getApprovalByRole(@Query('timeRange') timeRange?: TimeRange) {
    return this.statisticsService.getApprovalByRole(timeRange);
  }

  /**
   * 获取工单各阶段耗时分析
   */
  @Get('approval/phase-time')
  @ApiOperation({ summary: '工单各阶段耗时分析' })
  async getPhaseTimeAnalysis(@Query('timeRange') timeRange?: TimeRange) {
    return this.statisticsService.getPhaseTimeAnalysis(timeRange);
  }

  /**
   * 获取审批趋势
   */
  @Get('approval/trend')
  @ApiOperation({ summary: '审批趋势数据' })
  async getApprovalTrend(@Query('days') days?: number) {
    return this.statisticsService.getApprovalTrend(days ? parseInt(days as any) : 30);
  }

  /**
   * 获取按维度统计
   */
  @Get('analysis/:dimension')
  @ApiOperation({ summary: '按部门/类型/优先级统计' })
  async getAnalysisByDimension(
    @Param('dimension') dimension: 'department' | 'type' | 'priority',
    @Query('timeRange') timeRange?: TimeRange,
  ) {
    return this.statisticsService.getTicketAnalysisByDimension(dimension, timeRange);
  }
}
