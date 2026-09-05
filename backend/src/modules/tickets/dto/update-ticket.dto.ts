import { IsEnum, IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus, TicketPriority } from '@prisma/client';

export class UpdateTicketDto {
  @ApiProperty({ description: '工单标题', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '工单描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '工单状态',
    enum: TicketStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({
    description: '优先级',
    enum: TicketPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty({ description: '分配给用户ID', required: false })
  @IsOptional()
  assigneeId?: bigint;

  @ApiProperty({ description: '标签', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ description: '是否锁定', required: false })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}
