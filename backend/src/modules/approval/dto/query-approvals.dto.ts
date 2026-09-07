import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryApprovalsDto {
  @ApiPropertyOptional({
    description: '审批状态',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    example: 'PENDING'
  })
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;

  @ApiPropertyOptional({
    description: '审批类型',
    enum: ['REPAIR_REVIEW', 'BUDGET_REVIEW', 'PROJECT_APPROVAL', 'VISA_REVIEW', 'SETTLEMENT_REVIEW'],
    example: 'PROJECT_APPROVAL'
  })
  @IsOptional()
  @IsEnum(['REPAIR_REVIEW', 'BUDGET_REVIEW', 'PROJECT_APPROVAL', 'VISA_REVIEW', 'SETTLEMENT_REVIEW'])
  type?: string;

  @ApiPropertyOptional({
    description: '页码',
    minimum: 1,
    default: 1,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
