import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus, TicketPriority } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryTicketsDto {
  @ApiProperty({
    description: '工单状态',
    enum: TicketStatus,
    required: false,
    example: TicketStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({
    description: '优先级',
    enum: TicketPriority,
    required: false,
    example: TicketPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty({
    description: '处理人ID',
    required: false,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  assigneeId?: number;

  @ApiProperty({
    description: '创建人ID',
    required: false,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  creatorId?: number;

  @ApiProperty({
    description: '关键词搜索（标题或描述）',
    required: false,
    example: '电脑',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description: '页码',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    required: false,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiProperty({
    description: '排序字段',
    required: false,
    default: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'priority', 'status'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: '排序方式',
    required: false,
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
