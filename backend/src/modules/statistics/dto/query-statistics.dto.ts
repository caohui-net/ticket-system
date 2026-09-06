import { IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimeRange } from '../interfaces/statistics.interface';

/**
 * 查询统计数据DTO
 */
export class QueryStatisticsDto {
  @ApiPropertyOptional({
    description: '时间范围类型',
    enum: ['today', 'week', 'month', 'quarter', 'year', 'custom'],
    example: 'week',
  })
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'quarter', 'year', 'custom'])
  timeRange?: TimeRange;

  @ApiPropertyOptional({
    description: '开始日期（时间范围为custom时必填）',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '结束日期（时间范围为custom时必填）',
    example: '2026-09-06',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * 趋势查询DTO
 */
export class QueryTrendDto extends QueryStatisticsDto {
  @ApiPropertyOptional({
    description: '数据点数量（最近N天）',
    example: 7,
    default: 7,
  })
  @IsOptional()
  days?: number;
}
