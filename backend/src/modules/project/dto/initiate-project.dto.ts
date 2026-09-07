import { IsString, IsNotEmpty, MaxLength, IsDateString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiateProjectDto {
  @ApiProperty({
    description: '项目标题',
    example: '办公楼装修项目',
    type: String,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: '计划开始日期 (YYYY-MM-DD)',
    example: '2026-09-15',
    type: String,
  })
  @IsDateString()
  plannedStartDate: string;

  @ApiProperty({
    description: '计划工期（天）',
    example: 90,
    type: Number,
    minimum: 1,
    maximum: 365,
  })
  @IsInt()
  @Min(1)
  @Max(365)
  plannedDuration: number;

  @ApiProperty({
    description: '乙方名称',
    example: '某某建筑公司',
    type: String,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contractorName: string;

  @ApiPropertyOptional({
    description: '立项说明',
    example: '为改善办公环境，对办公楼进行全面装修',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
